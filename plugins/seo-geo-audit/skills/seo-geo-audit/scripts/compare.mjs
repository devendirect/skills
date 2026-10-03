#!/usr/bin/env node
// Compare one of the user's pages with the equivalent page of up to three
// competitors: what their served HTML carries that the user's does not.
//
// Usage:
//   node compare.mjs <your page URL> <competitor page URL> [up to 2 more] [--json]
//
// Read-only and polite (see references/politeness.md): one page per site,
// robots.txt respected for competitors, a pause between requests to a host,
// identified user agent, no retry on 403 / 429.
// Node 18+, no dependencies.

import { readFile } from "node:fs/promises";
import { analyzeHtml } from "./lib/html.mjs";
import { parse, groupsFor, decide } from "./lib/robots.mjs";

const UA = "seo-geo-audit (Claude Code skill; read-only comparison of one public page)";
const UA_TOKEN = "seo-geo-audit";
const PAUSE = 1000;
const MAX_COMPETITORS = 3;
const here = new URL(".", import.meta.url);

const args = process.argv.slice(2);
const json = args.includes("--json");
const urls = args.filter((a) => a !== "--json");
if (urls.length < 2 || urls.some((u) => !/^https?:\/\//i.test(u))) {
  console.error("usage: node compare.mjs <your page URL> <competitor page URL> [up to 2 more] [--json]");
  process.exit(2);
}
if (urls.length - 1 > MAX_COMPETITORS) {
  console.error(`error: at most ${MAX_COMPETITORS} competitors per run (see references/politeness.md).`);
  process.exit(2);
}

const crawlers = JSON.parse(await readFile(new URL("ai-crawlers.json", here), "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lastHit = new Map();

async function get(url) {
  const host = new URL(url).host;
  const wait = (lastHit.get(host) ?? 0) + PAUSE - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit.set(host, Date.now());
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,*/*" }, redirect: "follow", signal: AbortSignal.timeout(15000) });
    return { status: res.status, finalUrl: res.url, type: res.headers.get("content-type") ?? "", body: await res.text() };
  } catch (e) {
    return { status: null, error: e.cause?.code ?? e.name, body: "" };
  }
}

async function visit(url, own) {
  const out = { url, own, host: new URL(url).host };
  const robotsRes = await get(new URL("/robots.txt", url).href);
  const robots = robotsRes.status === 200 ? parse(robotsRes.body) : { groups: [], sitemaps: [] };
  out.robotsStatus = robotsRes.status;

  // Which search / user-fetch AI agents their robots.txt blocks from the whole site.
  out.blockedAgents = crawlers.agents
    .filter((a) => (a.family === "search" || a.family === "user" || a.family === "training") && !a.robotsOnly)
    .filter((a) => !decide("/", groupsFor(a.token, robots.groups).rules).allowed)
    .map((a) => `${a.token} (${a.family})`);

  if (!own) {
    const path = new URL(url).pathname + new URL(url).search;
    const verdict = decide(path, groupsFor(UA_TOKEN, robots.groups).rules);
    if (!verdict.allowed) return { ...out, skipped: `robots.txt forbids it (${verdict.by})` };
  }
  const page = await get(url);
  if (page.status === 403 || page.status === 429) return { ...out, skipped: `answered ${page.status}: not accessible to scripts, not retried` };
  if (page.status !== 200 || !/html/i.test(page.type)) return { ...out, skipped: `answered ${page.status ?? page.error}${page.type ? ` (${page.type})` : ""}` };
  const h = analyzeHtml(page.body);
  return {
    ...out,
    status: page.status,
    finalUrl: page.finalUrl,
    title: h.title,
    titleLength: h.title?.length ?? 0,
    descriptionLength: h.description[0]?.length ?? 0,
    canonical: h.canonical[0] ?? null,
    lang: h.lang,
    hreflang: h.hreflang.length,
    h1: h.h1.length,
    words: h.words,
    links: h.links,
    ogImage: Boolean(h.og["og:image"]),
    jsonldTypes: topTypes(h.jsonld),
    emptyRoot: h.emptyRoot,
  };
}

// Top-level types only (root objects and @graph members): nested Offer,
// Rating, Answer… belong to their parent and would only add noise.
function topTypes(blocks) {
  const types = new Set();
  for (const b of blocks.filter((x) => x.valid)) {
    const roots = [].concat(b.raw).flatMap((n) => (n && n["@graph"] ? [].concat(n["@graph"]) : [n]));
    for (const n of roots) if (n && n["@type"]) [].concat(n["@type"]).forEach((t) => types.add(t));
  }
  return [...types].sort();
}

const results = [];
results.push(await visit(urls[0], true));
for (const u of urls.slice(1)) results.push(await visit(u, false));

const me = results[0];
const others = results.slice(1).filter((r) => !r.skipped);
const findings = [];
if (me.skipped) findings.push(`Your page could not be read: ${me.skipped}.`);
if (!me.skipped && others.length) {
  const theirTypes = new Map();
  for (const o of others) for (const t of o.jsonldTypes) theirTypes.set(t, [...(theirTypes.get(t) ?? []), o.host]);
  const missing = [...theirTypes].filter(([t]) => !me.jsonldTypes.includes(t));
  if (missing.length) findings.push(`JSON-LD types used by competitors, not by your page: ${missing.map(([t, hosts]) => `${t} (${hosts.join(", ")})`).join(", ")}.`);
  const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const mw = median(others.map((o) => o.words));
  if (me.words < mw * 0.5) findings.push(`Your page has ${me.words} words of served text; the competitors' median is ${mw}.`);
  if (!me.ogImage && others.some((o) => o.ogImage)) findings.push(`No og:image on your page; ${others.filter((o) => o.ogImage).map((o) => o.host).join(", ")} have one.`);
  if (!me.hreflang && others.some((o) => o.hreflang)) findings.push(`Competitors declare hreflang (${others.filter((o) => o.hreflang).map((o) => `${o.host}: ${o.hreflang}`).join(", ")}); your page has none.`);
  if (me.emptyRoot && !others.some((o) => o.emptyRoot)) findings.push("Your page's served HTML is an empty app shell; the competitors' pages are not.");
}
for (const o of results.slice(1)) {
  const searchBlocked = (o.blockedAgents ?? []).filter((a) => !a.endsWith("(training)"));
  if (searchBlocked.length) findings.push(`${o.host} blocks AI search agents in robots.txt: ${searchBlocked.join(", ")}. Answers from those assistants cannot cite it.`);
}

const report = { comparedAt: new Date().toISOString(), results, findings };

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const cols = results.map((r) => (r.own ? `you: ${r.host}` : r.host));
  const row = (label, f) => console.log(`  ${label.padEnd(18)} ${results.map((r) => String(r.skipped ? "—" : f(r)).slice(0, 28).padEnd(30)).join("")}`);
  console.log(`  ${"".padEnd(18)} ${cols.map((c) => c.slice(0, 28).padEnd(30)).join("")}`);
  row("status", (r) => r.status);
  row("title length", (r) => r.titleLength);
  row("description len.", (r) => r.descriptionLength);
  row("h1", (r) => r.h1);
  row("words (served)", (r) => r.words);
  row("links", (r) => r.links);
  row("og:image", (r) => (r.ogImage ? "yes" : "no"));
  row("hreflang", (r) => r.hreflang);
  row("JSON-LD types", (r) => r.jsonldTypes.join(", ") || "none");
  console.log(`  ${"AI agents blocked".padEnd(18)} ${results.map((r) => String((r.blockedAgents ?? []).length ? r.blockedAgents.length + " (see JSON)" : "none").padEnd(30)).join("")}`);
  for (const r of results.filter((x) => x.skipped)) console.log(`\n  skipped ${r.url}: ${r.skipped}`);
  console.log(`\n## Findings (${findings.length})`);
  console.log(findings.length ? findings.map((f) => `  - ${f}`).join("\n") : "  none");
  console.log("\nFacts, not instructions: a competitor's choice is not automatically right for this site.");
}
