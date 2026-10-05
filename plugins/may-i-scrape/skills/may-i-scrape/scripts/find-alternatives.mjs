#!/usr/bin/env node
// Official ways to get the data without scraping:
//   - /.well-known/api-catalog (RFC 9727, a linkset of the site's APIs);
//   - links on the page to an API, a developer portal or open data;
//   - RSS / Atom feeds; sitemaps declared in robots.txt;
//   - with --datagouv only: datasets on data.gouv.fr matching the site's
//     domain. Off by default because it sends the domain name to a third party.
//
// Usage: node find-alternatives.mjs <URL> [--datagouv]
// Node 18+, no dependencies.

import { standalone } from "./lib/context.mjs";
import { anchors, links } from "./lib/page.mjs";

const API_LINK = /\bapis?\b|developers?|développeurs?|open ?data|données ouvertes|data\.gouv\.fr/i;
const DATAGOUV = "https://www.data.gouv.fr/api/1/datasets/";

async function apiCatalog(ctx) {
  const url = new URL("/.well-known/api-catalog", ctx.url).href;
  const r = await ctx.http.get(url, { accept: "application/linkset+json,application/json;q=0.9" });
  if (r.skipped || r.error) return { url, state: "not read", reason: r.skipped ?? r.error, items: [] };
  if (r.status < 200 || r.status >= 300) return { url, status: r.status, state: "absent", items: [] };
  try {
    const items = (JSON.parse(r.body).linkset ?? []).flatMap((set) => (set.item ?? []).map((i) => i.href)).filter(Boolean);
    return { url, status: r.status, state: "ok", items };
  } catch (e) {
    return { url, status: r.status, state: "invalid", reason: e.message, items: [] };
  }
}

async function dataGouv(ctx) {
  const q = ctx.url.hostname.replace(/^www\./, "");
  const url = `${DATAGOUV}?q=${encodeURIComponent(q)}&page_size=3`;
  const r = await ctx.http.get(url, { robots: false, accept: "application/json" });
  if (r.error || r.status !== 200) return { query: q, state: "error", reason: r.error ?? `HTTP ${r.status}`, datasets: [] };
  try {
    const data = JSON.parse(r.body).data ?? [];
    return { query: q, state: "ok", datasets: data.map((d) => ({ title: d.title, url: d.page, organization: d.organization?.name ?? null, license: d.license ?? null })) };
  } catch (e) {
    return { query: q, state: "invalid", reason: e.message, datasets: [] };
  }
}

export async function findAlternatives(ctx) {
  const html = await ctx.html();
  const absolute = (href) => { try { return new URL(href, ctx.url).href; } catch { return null; } };
  const seen = new Set();
  const pageLinks = [];
  for (const a of anchors(html)) {
    if (!a.href || a.href.startsWith("#") || !(API_LINK.test(a.text) || API_LINK.test(a.href))) continue;
    const href = absolute(a.href);
    if (!href || seen.has(href) || /^(mailto|tel|javascript):/i.test(href)) continue;
    seen.add(href);
    pageLinks.push({ href, text: a.text.slice(0, 80) });
  }
  const feeds = links(html)
    .filter((l) => (l.rel ?? "").toLowerCase() === "alternate" && /rss|atom/i.test(l.type ?? "") && absolute(l.href ?? ""))
    .map((l) => ({ href: absolute(l.href), type: l.type }));
  const robots = await ctx.robots();
  return {
    api_catalog: await apiCatalog(ctx),
    page_links: pageLinks.slice(0, 8),
    feeds,
    sitemaps: robots.parsed.sitemaps,
    datagouv: ctx.datagouv ? await dataGouv(ctx) : { state: "not requested (use --datagouv; sends the domain to data.gouv.fr)" },
  };
}

await standalone(import.meta.url, findAlternatives);
