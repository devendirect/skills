#!/usr/bin/env node
// Finds and reads the site's terms of use: links on the page (else on the home
// page) whose text or address looks like terms of use, terms and conditions
// or a legal notice, in French or English (scripts/keywords.json). Reads at
// most 3 pages, same site only, robots.txt respected.
//
// Usage: node find-terms.mjs <URL> [--agent token]
// Node 18+, no dependencies.

import { readFile } from "node:fs/promises";
import { standalone } from "./lib/context.mjs";
import { anchors } from "./lib/page.mjs";

const keywords = JSON.parse(await readFile(new URL("keywords.json", import.meta.url), "utf8"));
const LINK_RULES = keywords.terms_links.map((r) => ({ text: new RegExp(r.text, "i"), slug: new RegExp(r.slug, "i"), score: r.score }));

// Whole link text, or a whole path segment: "Legal" matches, "451 Unavailable
// For Legal Reasons" or /2026/sep/30/legal-objections-… do not.
export function linkScore(text, pathname) {
  const t = text.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").replace(/[\s:.»›>]+$/, "").trim();
  let segments = [];
  try { segments = decodeURIComponent(pathname).toLowerCase().split("/").filter(Boolean).map((s) => s.replace(/\.(html?|php|aspx?)$/, "")); } catch {}
  // "Mentions légales et crédits", "Legal and privacy": also try the first part
  // of a compound label, but only when that part has several words, so a lone
  // "legal" at the start of a news headline does not count.
  const head = t.split(/ (?:et|and|&|\/) |\s*[,|·•]\s*/)[0];
  const texts = [t, ...(head !== t && head.includes(" ") ? [head] : [])];
  const hits = LINK_RULES.filter((r) => (t.length <= 60 && texts.some((x) => r.text.test(x))) || segments.some((s) => r.slug.test(s)));
  return Math.max(0, ...hits.map((r) => r.score));
}
export const MAX_TERMS_PAGES = 3;

const site = (host) => host.toLowerCase().replace(/^www\./, "");
const sameSite = (a, b) => { const x = site(a); const y = site(b); return x === y || x.endsWith("." + y) || y.endsWith("." + x); };

function candidates(html, base) {
  const out = new Map();   // url -> { url, label, score }
  for (const a of anchors(html)) {
    let url;
    try { url = new URL(a.href, base); } catch { continue; }
    if (!/^https?:$/.test(url.protocol) || !sameSite(url.hostname, base.hostname)) continue;
    url.hash = "";
    const score = linkScore(a.text, url.pathname);
    if (!score) continue;
    const prev = out.get(url.href);
    if (!prev || prev.score < score) out.set(url.href, { url: url.href, label: a.text.slice(0, 80), score });
  }
  // Highest score first; equal scores keep the page order.
  return [...out.values()].sort((a, b) => b.score - a.score);
}

export async function findTerms(ctx) {
  if (ctx.offline) {
    return ctx.offline.terms
      ? { found: true, read: true, source: "pasted", candidates: [], pages: [{ url: "(pasted by the user)", read: true, body: ctx.offline.terms, html: /<[a-z][\s\S]*>/i.test(ctx.offline.terms) }] }
      : { found: false, read: false, source: "offline", candidates: [], pages: [], reason: "terms of use not provided (offline mode)" };
  }

  let source = "page";
  let list = candidates(await ctx.html(), ctx.url);
  if (!list.length && ctx.url.pathname + ctx.url.search !== "/") {
    source = "home page";
    const home = await ctx.http.get(new URL("/", ctx.url).href);
    list = home.status >= 200 && home.status < 300 ? candidates(home.body, new URL(home.url)) : [];
  }
  if (!list.length) return { found: false, read: false, source, candidates: [], pages: [], reason: "no link to terms of use or legal notice found" };

  const pages = [];
  const queue = list.slice(0, MAX_TERMS_PAGES);
  const seen = new Set(queue.map((c) => c.url));
  while (queue.length && pages.length < MAX_TERMS_PAGES) {
    const c = queue.shift();
    const r = await ctx.http.get(c.url);
    const type = r.headers?.["content-type"] ?? "";
    const ok = r.status >= 200 && r.status < 300;
    const readable = ok && /html|text\/plain/i.test(type || "text/html");
    pages.push({
      url: c.url, label: c.label, status: r.status, read: readable,
      reason: r.skipped ?? r.error ?? (!ok ? `HTTP ${r.status}` : !readable ? `not HTML (${type})` : undefined),
      body: readable ? r.body : "", html: !/text\/plain/i.test(type),
    });
    // Rules about scraping are sometimes in a page linked from the terms
    // (GitHub's "Acceptable Use Policies"): follow strong links (score 3)
    // found in a terms page, within the same budget of pages.
    if (r.url) seen.add(new URL(r.url).href.replace(/#.*$/, ""));   // after a redirect, the page itself
    if (readable) {
      for (const sub of candidates(r.body, new URL(r.url ?? c.url)).filter((x) => x.score >= 3 && !seen.has(x.url))) {
        seen.add(sub.url);
        queue.push({ ...sub, label: `${sub.label} (linked from ${c.label})` });
      }
      queue.sort((a, b) => b.score - a.score);   // acceptable-use pages first
    }
  }
  return { found: true, read: pages.some((p) => p.read), source, candidates: list.slice(0, 8).map(({ url, label, score }) => ({ url, label, score })), pages };
}

// Standalone output without the page bodies.
await standalone(import.meta.url, async (ctx) => {
  const t = await findTerms(ctx);
  return { ...t, pages: t.pages.map(({ body, ...p }) => ({ ...p, length: body.length })) };
});
