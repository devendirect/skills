#!/usr/bin/env node
// Text and data mining reservation, TDMRep protocol (W3C Community Group
// final report, 2024-05-10, see references/sources.md):
//   1. /.well-known/tdmrep.json: an array of { location, tdm-reservation,
//      tdm-policy }; the first rule whose location matches wins ("*" and "$");
//   2. HTTP headers tdm-reservation / tdm-policy supersede the file;
//   3. <meta name="tdm-reservation"> / tdm-policy supersede both.
// The absence of a value never resets a previous one. 1 = reserved,
// 0 = not reserved, anything else = protocol error, treated as unset.
//
// Usage: node check-tdm.mjs <URL> [--agent token]
// Node 18+, no dependencies.

import { patternToRegex } from "./lib/robots.mjs";
import { standalone } from "./lib/context.mjs";
import { meta } from "./lib/page.mjs";

const value = (v) => (v === 1 || v === "1" ? 1 : v === 0 || v === "0" ? 0 : null);

async function readFile(ctx) {
  const url = new URL("/.well-known/tdmrep.json", ctx.url).href;
  const r = await ctx.http.get(url, { accept: "application/json,*/*" });
  if (r.skipped || r.error) return { url, state: "not read", reason: r.skipped ?? r.error, matched: null };
  if (r.status === 404 || r.status === 410) return { url, status: r.status, state: "absent", matched: null };
  if (r.status < 200 || r.status >= 300) return { url, status: r.status, state: "not read", reason: `HTTP ${r.status}`, matched: null };
  let rules;
  try {
    rules = JSON.parse(r.body);
    if (!Array.isArray(rules)) throw new Error("not a JSON array");
  } catch (e) {
    return { url, status: r.status, state: "invalid", reason: e.message, matched: null };
  }
  const path = ctx.url.pathname;
  const hit = rules.find((rule) => typeof rule?.location === "string" && patternToRegex(rule.location).test(path));
  const matched = hit ? { location: hit.location, reservation: value(hit["tdm-reservation"]), policy: hit["tdm-policy"] ?? null } : null;
  return { url, status: r.status, state: "ok", rules: rules.length, matched };
}

export async function checkTdm(ctx) {
  const file = await readFile(ctx);
  const p = await ctx.page();
  const html = await ctx.html();
  const header = { reservation: value(p.headers?.["tdm-reservation"]), policy: p.headers?.["tdm-policy"] ?? null };
  const metaTags = { reservation: value(meta(html, "tdm-reservation")), policy: meta(html, "tdm-policy") };

  let reservation = null;
  let policy = null;
  let source = null;
  for (const [name, layer] of [["file", file.matched], ["header", header], ["meta", metaTags]]) {
    if (!layer) continue;
    if (layer.reservation !== null) { reservation = layer.reservation; source = name; }
    if (layer.policy) policy = layer.policy;
  }
  return { file, header, meta: metaTags, reserved: reservation === null ? null : reservation === 1, policy, source };
}

await standalone(import.meta.url, checkTdm);
