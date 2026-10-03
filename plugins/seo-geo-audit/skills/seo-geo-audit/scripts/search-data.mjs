#!/usr/bin/env node
// Real search data: what people search, where the site appears, what gets clicks.
//
// Usage:
//   node search-data.mjs csv <Queries.csv | Pages.csv> [--json]
//       A Search Console Performance export (any interface language).
//   node search-data.mjs gsc --site <property> [--days 90] [--dimension query|page] [--json]
//       Search Console API. Auth: GSC_KEY_FILE (service-account JSON key, the
//       account added as a user of the property) or GSC_ACCESS_TOKEN (OAuth token
//       with the webmasters.readonly scope).
//   node search-data.mjs inspect --site <property> --url <page URL> [--json]
//       Search Console URL Inspection (same auth): index status of one page.
//   node search-data.mjs bing --site <site URL> [--dimension query|page] [--json]
//       Bing Webmaster API. Auth: BING_WEBMASTER_API_KEY (Bing Webmaster Tools →
//       Settings → API access).
//
// <property> is "sc-domain:example.com" for a domain property, or the exact
// URL-prefix property with its trailing slash ("https://example.com/").
// Keys and tokens are read from the environment, never from arguments, and
// never printed. Node 18+, no dependencies.

import { readFile } from "node:fs/promises";
import { createSign } from "node:crypto";

const GSC_API = process.env.GSC_API_BASE ?? "https://www.googleapis.com";
const INSPECT_API = process.env.GSC_INSPECT_API_BASE ?? "https://searchconsole.googleapis.com";
const BING_API = process.env.BING_API_BASE ?? "https://ssl.bing.com";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

const [mode, ...rest] = process.argv.slice(2);
const json = rest.includes("--json");
const opt = (name, def = null) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : def; };
const fail = (msg, code = 2) => { console.error(msg); process.exit(code); };
const USAGE = "usage: node search-data.mjs csv <file.csv> | gsc --site <property> [--days 90] [--dimension query|page] | inspect --site <property> --url <url> | bing --site <url> [--dimension query|page]  [--json]";

// --- auth ------------------------------------------------------------------

const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

async function googleToken() {
  if (process.env.GSC_ACCESS_TOKEN) return process.env.GSC_ACCESS_TOKEN;
  const file = process.env.GSC_KEY_FILE;
  if (!file) fail("Set GSC_KEY_FILE (service-account JSON key) or GSC_ACCESS_TOKEN. See references/search-data.md.", 4);
  const key = JSON.parse(await readFile(file, "utf8"));
  if (!key.client_email || !key.private_key) fail(`${file} is not a service-account key (client_email / private_key missing).`, 4);
  const tokenUri = key.token_uri ?? "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify({ iss: key.client_email, scope: SCOPE, aud: tokenUri, iat: now, exp: now + 3600 }))}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key.private_key);
  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${b64url(signature)}` }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) fail(`Token request refused (${res.status}): ${body.error_description ?? body.error ?? "no detail"}.`, 4);
  return body.access_token;
}

async function call(url, init) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.error?.message ?? body.Message ?? body.message ?? JSON.stringify(body).slice(0, 200);
    const hint = res.status === 403 ? " The account may not be a user of this property, or the property string is wrong (sc-domain:… vs https://…/)." : "";
    fail(`API error ${res.status}: ${msg}.${hint}`, 1);
  }
  return body;
}

// --- sources ---------------------------------------------------------------

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((f) => f !== "")) rows.push(row); }
  return rows;
}

// Search Console exports: label, clicks, impressions, CTR ("4.5%" / "4,5 %"), position.
// Column names depend on the interface language, so columns are read by position.
const num = (s) => Number(String(s).replace(/[%\s  ]/g, "").replace(",", "."));
async function fromCsv(file) {
  const rows = parseCsv((await readFile(file, "utf8")).replace(/^﻿/, ""));
  if (rows.length < 2 || rows[0].length < 5) fail(`${file} does not look like a Search Console export (label, clicks, impressions, CTR, position).`, 1);
  return {
    source: `Search Console export ${file}`,
    dimension: /page|url/i.test(rows[0][0]) ? "page" : "query",
    rows: rows.slice(1).map((r) => ({ key: r[0], clicks: num(r[1]), impressions: num(r[2]), ctr: num(r[3]) / 100, position: num(r[4]) })),
  };
}

async function fromGsc(site, days, dimension) {
  const end = new Date(Date.now() - 3 * 86400000); // recent days are incomplete
  const start = new Date(end.getTime() - days * 86400000);
  const d = (x) => x.toISOString().slice(0, 10);
  const token = await googleToken();
  const body = await call(`${GSC_API}/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ startDate: d(start), endDate: d(end), dimensions: [dimension], rowLimit: 5000, type: "web" }),
  });
  return {
    source: `Search Console API, ${site}, ${d(start)} → ${d(end)}`,
    dimension,
    rows: (body.rows ?? []).map((r) => ({ key: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
  };
}

async function fromBing(site, dimension) {
  const key = process.env.BING_WEBMASTER_API_KEY;
  if (!key) fail("Set BING_WEBMASTER_API_KEY (Bing Webmaster Tools → Settings → API access). See references/search-data.md.", 4);
  const method = dimension === "page" ? "GetPageStats" : "GetQueryStats";
  const body = await call(`${BING_API}/webmaster/api.svc/json/${method}?siteUrl=${encodeURIComponent(site)}&apikey=${encodeURIComponent(key)}`, {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
  // One row per key and day: sum clicks and impressions, average positions weighted by impressions.
  const agg = new Map();
  for (const r of body.d ?? []) {
    const k = r.Query ?? r.Page ?? r.Url ?? "?";
    const a = agg.get(k) ?? { key: k, clicks: 0, impressions: 0, posSum: 0 };
    a.clicks += r.Clicks ?? 0;
    a.impressions += r.Impressions ?? 0;
    a.posSum += (r.AvgImpressionPosition ?? 0) * (r.Impressions ?? 0);
    agg.set(k, a);
  }
  return {
    source: `Bing Webmaster API (${method}), ${site}`,
    dimension,
    note: "Bing positions are returned as the API gives them; check their scale in Bing Webmaster Tools before comparing with Google.",
    rows: [...agg.values()].map((a) => ({ key: a.key, clicks: a.clicks, impressions: a.impressions, ctr: a.impressions ? a.clicks / a.impressions : 0, position: a.impressions ? a.posSum / a.impressions : null })),
  };
}

async function inspect(site, url) {
  const token = await googleToken();
  const body = await call(`${INSPECT_API}/v1/urlInspection/index:inspect`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: site }),
  });
  const r = body.inspectionResult?.indexStatusResult ?? {};
  return {
    url, site,
    verdict: r.verdict ?? null, coverageState: r.coverageState ?? null, indexingState: r.indexingState ?? null,
    robotsTxtState: r.robotsTxtState ?? null, pageFetchState: r.pageFetchState ?? null, lastCrawlTime: r.lastCrawlTime ?? null,
    googleCanonical: r.googleCanonical ?? null, userCanonical: r.userCanonical ?? null,
  };
}

// --- analysis --------------------------------------------------------------

function analyze(data) {
  const rows = data.rows.filter((r) => Number.isFinite(r.impressions));
  const total = rows.reduce((t, r) => ({ clicks: t.clicks + r.clicks, impressions: t.impressions + r.impressions }), { clicks: 0, impressions: 0 });
  const sorted = (f) => [...rows].sort(f);
  // "Seen often" = at least the median impressions, and never under 10.
  const minImpr = Math.max(10, sorted((a, b) => a.impressions - b.impressions)[Math.floor(rows.length / 2)]?.impressions ?? 10);
  return {
    ...data,
    rows: undefined,
    count: rows.length,
    totals: { ...total, ctr: total.impressions ? total.clicks / total.impressions : 0 },
    topByClicks: sorted((a, b) => b.clicks - a.clicks).slice(0, 10),
    // Seen often, ranked just off the top: the cheapest gains.
    nearTop: sorted((a, b) => b.impressions - a.impressions).filter((r) => r.impressions >= minImpr && r.position >= 4 && r.position <= 20).slice(0, 10),
    // Seen, never clicked: missing or weak page for that query.
    noClicks: sorted((a, b) => b.impressions - a.impressions).filter((r) => r.clicks === 0 && r.impressions >= minImpr).slice(0, 10),
  };
}

function print(a) {
  const pct = (x) => `${(x * 100).toFixed(1)}%`;
  const line = (r) => `  ${String(r.key).slice(0, 60).padEnd(62)} ${String(Math.round(r.clicks)).padStart(6)} clicks ${String(Math.round(r.impressions)).padStart(8)} impr. ${pct(r.ctr).padStart(6)}  pos ${r.position === null ? "—" : r.position.toFixed(1)}`;
  console.log(`# ${a.source}`);
  console.log(`${a.count} ${a.dimension === "page" ? "pages" : "queries"}, ${Math.round(a.totals.clicks)} clicks, ${Math.round(a.totals.impressions)} impressions, CTR ${pct(a.totals.ctr)}`);
  if (a.note) console.log(a.note);
  console.log("\n## Top by clicks");
  a.topByClicks.forEach((r) => console.log(line(r)));
  console.log("\n## Seen often, ranked 4–20 (closest gains)");
  console.log(a.nearTop.length ? a.nearTop.map(line).join("\n") : "  none");
  console.log("\n## Seen, never clicked");
  console.log(a.noClicks.length ? a.noClicks.map(line).join("\n") : "  none");
}

// --- run -------------------------------------------------------------------

if (mode === "csv") {
  const file = rest.find((x) => !x.startsWith("--"));
  if (!file) fail(USAGE);
  const a = analyze(await fromCsv(file));
  json ? console.log(JSON.stringify(a, null, 2)) : print(a);
} else if (mode === "gsc" || mode === "bing") {
  const site = opt("--site");
  const dimension = opt("--dimension", "query");
  const days = Number(opt("--days", "90"));
  if (!site || !["query", "page"].includes(dimension) || !Number.isFinite(days)) fail(USAGE);
  const a = analyze(mode === "gsc" ? await fromGsc(site, days, dimension) : await fromBing(site, dimension));
  json ? console.log(JSON.stringify(a, null, 2)) : print(a);
} else if (mode === "inspect") {
  const site = opt("--site"), url = opt("--url");
  if (!site || !url) fail(USAGE);
  const r = await inspect(site, url);
  if (json) console.log(JSON.stringify(r, null, 2));
  else for (const [k, v] of Object.entries(r)) console.log(`  ${k.padEnd(16)} ${v ?? "—"}`);
} else {
  fail(USAGE);
}
