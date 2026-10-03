#!/usr/bin/env node
// Live SEO checks on a page and its site, from the raw HTML as served
// (no JavaScript execution: what most AI crawlers see).
//
// Usage:
//   node check-live.mjs <page URL> [--sample N] [--no-site] [--json]
//
//   --sample N   how many sitemap URLs to list (default 5)
//   --no-site    only check the page (skip robots, sitemap, llms.txt, 404, host redirects)
//   --json       machine-readable output
//
// Sequential requests with a short pause: run it on sites you own or audit
// with permission. Node 18+, no dependencies.

import { decode, analyzeHtml } from "./lib/html.mjs";

const UA = "seo-geo-audit (Claude Code skill; audit run by the site owner)";
const TIMEOUT = 15000;
const PAUSE = 300;

const args = process.argv.slice(2);
const json = args.includes("--json");
const noSite = args.includes("--no-site");
let sample = 5;
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--json" || args[i] === "--no-site") continue;
  if (args[i] === "--sample") { sample = Number(args[++i]); continue; }
  positional.push(args[i]);
}
const target = positional[0];
if (positional.length !== 1 || !/^https?:\/\//i.test(target) || !Number.isFinite(sample)) {
  console.error("usage: node check-live.mjs <page URL> [--sample N] [--no-site] [--json]");
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One request, no automatic redirect.
async function hit(url, method = "GET") {
  await sleep(PAUSE);
  try {
    const res = await fetch(url, { method, redirect: "manual", headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,*/*" }, signal: AbortSignal.timeout(TIMEOUT) });
    const body = method === "GET" ? await res.text() : "";
    return { url, status: res.status, headers: Object.fromEntries(res.headers), body };
  } catch (e) {
    return { url, status: null, error: e.cause?.code ?? e.name ?? String(e), headers: {}, body: "" };
  }
}

// Follow redirects by hand to record each hop.
async function follow(url, max = 10) {
  const chain = [];
  let current = url;
  for (let i = 0; i <= max; i++) {
    const r = await hit(current);
    chain.push({ url: current, status: r.status, location: r.headers.location ?? null, error: r.error });
    if (r.status >= 300 && r.status < 400 && r.headers.location) {
      const next = new URL(r.headers.location, current).href;
      if (chain.some((c) => c.url === next)) { chain.push({ url: next, status: null, error: "redirect loop" }); return { chain, final: r, error: "redirect loop" }; }
      current = next;
      continue;
    }
    return { chain, final: r };
  }
  return { chain, final: null, error: "too many redirects" };
}

// --- sitemap ---------------------------------------------------------------

async function readSitemap(url, depth = 0) {
  const r = await hit(url);
  if (r.status !== 200) return { url, status: r.status, error: r.error };
  if (!/<(urlset|sitemapindex)\b/i.test(r.body)) return { url, status: 200, kind: "not a sitemap", contentType: r.headers["content-type"] ?? null };
  const locs = [...r.body.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)].map((m) => decode(m[1]));
  const lastmods = [...r.body.matchAll(/<lastmod>\s*([\s\S]*?)\s*<\/lastmod>/gi)].map((m) => m[1]);
  if (/<sitemapindex\b/i.test(r.body)) {
    const first = locs[0] && depth < 2 ? await readSitemap(locs[0], depth + 1) : null;
    return { url, status: 200, kind: "index", children: locs.length, childSample: locs.slice(0, 5), firstChild: first };
  }
  const sameLastmod = lastmods.length > 5 && new Set(lastmods).size === 1;
  return { url, status: 200, kind: "urlset", urls: locs.length, sample: locs.slice(0, sample), lastmodCount: lastmods.length, sameLastmodEverywhere: sameLastmod };
}

// --- run -------------------------------------------------------------------

const page = await follow(target);
const final = page.final;
const pageUrl = page.chain.at(-1).url;
const H = final?.headers ?? {};
const report = {
  checkedAt: new Date().toISOString(),
  target,
  redirects: page.chain,
  finalUrl: pageUrl,
  status: final?.status ?? null,
  error: page.error ?? final?.error ?? null,
  headers: {
    "content-type": H["content-type"] ?? null,
    "x-robots-tag": H["x-robots-tag"] ?? null,
    "cache-control": H["cache-control"] ?? null,
    "content-language": H["content-language"] ?? null,
    link: H.link ?? null,
  },
  html: final?.status === 200 && /html/i.test(H["content-type"] ?? "") ? analyzeHtml(final.body) : null,
  site: null,
  findings: [],
};

if (!noSite && final) {
  const origin = new URL(pageUrl).origin;
  const u = new URL(pageUrl);
  const site = {};

  // Host variants: http vs https, www vs non-www.
  const variants = new Set([`http://${u.host}/`]);
  const isLocal = u.hostname === "localhost" || /^[\d.]+$/.test(u.hostname) || u.hostname.includes(":");
  if (!isLocal) variants.add(u.hostname.startsWith("www.") ? `${u.protocol}//${u.host.slice(4)}/` : `${u.protocol}//www.${u.host}/`);
  site.hostVariants = [];
  for (const v of variants) {
    const f = await follow(v, 5);
    site.hostVariants.push({ from: v, hops: f.chain.length - 1, to: f.chain.at(-1).url, status: f.final?.status ?? null, error: f.final?.error ?? f.chain.at(-1).error ?? null });
  }

  const robots = await hit(`${origin}/robots.txt`);
  const sitemapsDeclared = robots.status === 200 ? [...robots.body.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)].map((m) => m[1]) : [];
  site.robots = { status: robots.status, sitemapsDeclared, bytes: robots.body.length };

  const sitemapUrl = sitemapsDeclared[0] ?? `${origin}/sitemap.xml`;
  site.sitemap = await readSitemap(sitemapUrl);
  site.sitemap.declaredInRobots = sitemapsDeclared.length > 0;

  for (const f of ["llms.txt", "llms-full.txt"]) {
    const r = await hit(`${origin}/${f}`);
    site[f] = { status: r.status, contentType: r.headers["content-type"] ?? null, bytes: r.body.length };
  }

  const missing = `${origin}/seo-geo-audit-${Math.random().toString(36).slice(2, 10)}`;
  const nf = await follow(missing, 5);
  site.notFound = { url: missing, status: nf.final?.status ?? null, redirectedTo: nf.chain.length > 1 ? nf.chain.at(-1).url : null };

  report.site = site;
}

// --- findings: facts the model should look at first -------------------------

const F = report.findings;
const h = report.html;
if (report.error === "redirect loop") F.push("Redirect loop: the page never loads.");
else if (report.status !== 200) F.push(`Page answered ${report.status ?? report.error}, not 200.`);
if (page.chain.length > 2) F.push(`Redirect chain of ${page.chain.length - 1} hops before the page.`);
for (const hop of page.chain) {
  if (hop.status === 302 || hop.status === 307) F.push(`Temporary redirect (${hop.status}) from ${hop.url} to ${hop.location}: is it really temporary? A permanent setup should use 301 / 308.`);
}
if (/noindex/i.test(report.headers["x-robots-tag"] ?? "")) F.push(`X-Robots-Tag header contains noindex: "${report.headers["x-robots-tag"]}".`);
if (h) {
  if (h.robots.some((r) => /noindex/i.test(r))) F.push(`Meta robots contains noindex: "${h.robots.join(" | ")}".`);
  if (!h.title) F.push("No <title>.");
  if (!h.description.length) F.push("No meta description.");
  if (h.canonical.length === 0) F.push("No canonical link.");
  if (h.canonical.length > 1) F.push(`${h.canonical.length} canonical links (should be one).`);
  if (h.canonical.length === 1 && new URL(h.canonical[0], pageUrl).href !== pageUrl) F.push(`Canonical points elsewhere: ${h.canonical[0]}.`);
  if (h.h1.length !== 1) F.push(`${h.h1.length} <h1> in the served HTML.`);
  if (!h.lang) F.push("No lang attribute on <html>.");
  if (h.words < 100) F.push(`Only ${h.words} words of text in the served HTML${h.emptyRoot ? " and an empty app root: content is likely rendered by JavaScript, invisible to most AI crawlers" : ""}.`);
  if (h.jsonld.some((b) => !b.valid)) F.push("Invalid JSON-LD block (does not parse).");
  if (h.jsonld.length === 0) F.push("No JSON-LD.");
  if (!h.og["og:image"]) F.push("No og:image.");
}
const s = report.site;
if (s) {
  for (const v of s.hostVariants) {
    if (v.error === "ENOTFOUND") continue; // no DNS record for that variant: nothing to redirect
    if (v.error || v.status !== 200) F.push(`${v.from} does not end on a 200 (${v.status ?? v.error}).`);
    else if (new URL(v.to).origin !== new URL(pageUrl).origin) F.push(`${v.from} does not redirect to ${new URL(pageUrl).origin} (it serves ${v.to} with a 200): duplicate host.`);
    if (v.hops > 1) F.push(`${v.from} takes ${v.hops} redirects.`);
  }
  if (s.robots.status !== 200) F.push(`robots.txt answered ${s.robots.status}.`);
  if (s.robots.status === 200 && !s.sitemap.declaredInRobots) F.push("No Sitemap line in robots.txt.");
  if (s.sitemap.status !== 200) F.push(`Sitemap ${s.sitemap.url} answered ${s.sitemap.status ?? s.sitemap.error}.`);
  else if (s.sitemap.kind === "not a sitemap") F.push(`Sitemap ${s.sitemap.url} answers 200 but is not a sitemap (${s.sitemap.contentType ?? "unknown type"}): no sitemap, probably an app fallback page.`);
  else if (s.sitemap.kind === "urlset" && s.sitemap.urls === 0) F.push(`Sitemap ${s.sitemap.url} lists no URL.`);
  if (s.sitemap.sameLastmodEverywhere) F.push("Every sitemap URL has the same lastmod: probably the build date, not real changes.");
  for (const f of ["llms.txt", "llms-full.txt"]) {
    if (s[f].status === 200 && /html/i.test(s[f].contentType ?? "")) F.push(`/${f} answers 200 but as HTML: probably an error page, not a real ${f}.`);
  }
  if (s.notFound.status === 200) F.push("A random URL answers 200: soft 404.");
  else if (s.notFound.redirectedTo) F.push(`A random URL redirects to ${s.notFound.redirectedTo} instead of answering 404.`);
}

// --- output ----------------------------------------------------------------

if (json) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const line = (k, v) => console.log(`  ${k.padEnd(18)} ${v ?? "—"}`);
console.log(`# ${report.target}  (${report.checkedAt})\n`);
console.log("## Page");
line("final URL", report.finalUrl);
line("status", report.status ?? report.error);
line("redirects", page.chain.length > 1 ? page.chain.map((c) => `${c.status} ${c.url}`).join(" → ") : "none");
for (const [k, v] of Object.entries(report.headers)) if (v) line(k, v);
if (h) {
  line("lang", h.lang);
  line("title", h.title);
  line("description", h.description.join(" | ") || null);
  line("meta robots", h.robots.join(" | ") || null);
  line("canonical", h.canonical.join(" | ") || null);
  line("hreflang", h.hreflang.map((x) => `${x.hreflang} ${x.href}`).join(" | ") || null);
  line("h1", h.h1.length ? h.h1.map((x) => `"${x}"`).join(" | ") : null);
  line("words (served)", `${h.words}${h.emptyRoot ? " (empty app root)" : ""}`);
  for (const [k, v] of Object.entries(h.og)) line(k, v);
  console.log(`\n## JSON-LD (${h.jsonld.length} block${h.jsonld.length === 1 ? "" : "s"})`);
  for (const b of h.jsonld) {
    if (!b.valid) { console.log(`  [${b.index}] INVALID: ${b.error}\n      ${b.excerpt}`); continue; }
    console.log(`  [${b.index}] types: ${b.types.join(", ") || "(none)"}`);
    console.log(JSON.stringify(b.raw, null, 2).split("\n").map((l) => "      " + l).join("\n"));
  }
}
if (s) {
  console.log("\n## Site");
  for (const v of s.hostVariants) line("host variant", `${v.from} → ${v.to} (${v.status ?? v.error}, ${v.hops} hop${v.hops === 1 ? "" : "s"})`);
  line("robots.txt", `${s.robots.status}${s.robots.sitemapsDeclared.length ? `, sitemaps: ${s.robots.sitemapsDeclared.join(", ")}` : ""}`);
  const sm = s.sitemap;
  if (sm.status !== 200) line("sitemap", `${sm.url}: ${sm.status ?? sm.error}`);
  else if (sm.kind === "not a sitemap") line("sitemap", `${sm.url}: 200 but not a sitemap (${sm.contentType})`);
  else if (sm.kind === "index") {
    line("sitemap", `${sm.url}: index of ${sm.children} sitemaps`);
    if (sm.firstChild?.sample) line("first child", `${sm.firstChild.url}: ${sm.firstChild.urls} URLs`), sm.firstChild.sample.forEach((x) => line("", x));
  } else {
    line("sitemap", `${sm.url}: ${sm.urls} URLs, ${sm.lastmodCount} with lastmod`);
    sm.sample.forEach((x) => line("", x));
  }
  line("llms.txt", `${s["llms.txt"].status}${s["llms.txt"].status === 200 ? `, ${s["llms.txt"].bytes} bytes, ${s["llms.txt"].contentType}` : ""}`);
  line("llms-full.txt", s["llms-full.txt"].status);
  line("random URL", `${s.notFound.status}${s.notFound.redirectedTo ? ` → ${s.notFound.redirectedTo}` : ""}`);
}
console.log(`\n## Findings (${F.length})`);
console.log(F.length ? F.map((f) => `  - ${f}`).join("\n") : "  none");
console.log("\nManual checks:");
console.log(`  Rich Results Test  https://search.google.com/test/rich-results?url=${encodeURIComponent(report.finalUrl)}`);
console.log(`  PageSpeed Insights https://pagespeed.web.dev/analysis?url=${encodeURIComponent(report.finalUrl)}`);
