#!/usr/bin/env node
// Freshness check for may-i-scrape's facts (same as tests/seo-geo-audit/check-sources.mjs):
// - every URL in references/sources.md still answers (and where it moved),
// - the "last checked" date of SKILL.md and of every references/legal-*.md
//   is not too old (same reading as the skill's own lib/freshness.mjs).
//
// Usage: node check-sources.mjs [--max-age days] [--json]
//
// Exit 1 if a source is gone (404, 410, 5xx, network error) or a file's facts
// are older than --max-age (default 90 days, stricter than the 183 days after
// which the skill warns its users). 401 / 403 / 429 are reported as
// "check by hand": some sites block scripted requests.
// Node 18+, no dependencies.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const skill = join(here, "..", "..", "plugins", "may-i-scrape", "skills", "may-i-scrape");
const UA = "Mozilla/5.0 (compatible; may-i-scrape-source-check)";

const args = process.argv.slice(2);
const json = args.includes("--json");
const maxAgeIdx = args.indexOf("--max-age");
const maxAge = maxAgeIdx >= 0 ? Number(args[maxAgeIdx + 1]) : 90;

const sources = await readFile(join(skill, "references", "sources.md"), "utf8");
const urls = [...new Set([...sources.matchAll(/https?:\/\/[^\s|,)>]+/g)].map((m) => m[0].replace(/[.;]$/, "")))];

async function check(url) {
  let current = url;
  const hops = [];
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch(current, { redirect: "manual", headers: { "user-agent": UA, accept: "text/html,*/*" }, signal: AbortSignal.timeout(20000) });
      await res.body?.cancel();
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        hops.push(res.status);
        current = new URL(res.headers.get("location"), current).href;
        continue;
      }
      return { url, status: res.status, finalUrl: current, hops };
    } catch (e) {
      return { url, status: null, error: e.cause?.code ?? e.name, finalUrl: current, hops };
    }
  }
  return { url, status: null, error: "too many redirects", finalUrl: current, hops };
}

// A server error or a network error can be momentary: try once more after a pause.
async function checkWithRetry(url) {
  const first = await check(url);
  if (first.status !== null && first.status < 500) return first;
  await new Promise((r) => setTimeout(r, 5000));
  return check(url);
}

// A few at a time, to stay polite.
const results = [];
for (let i = 0; i < urls.length; i += 4) results.push(...(await Promise.all(urls.slice(i, i + 4).map(checkWithRetry))));

// Host + path only: language parameters (?hl=…) added by redirects are not a move.
const strip = (u) => { const x = new URL(u); return (x.host.replace(/^www\./, "") + x.pathname).replace(/\/$/, ""); };
// Official sites that block or stall scripted requests: always checked by hand.
const BY_HAND_HOSTS = ["www.legifrance.gouv.fr", "leginfo.legislature.ca.gov"];
const byHandHost = (r) => BY_HAND_HOSTS.includes(new URL(r.url).host);
const gone = results.filter((r) => !byHandHost(r) && (r.status === null || r.status === 404 || r.status === 410 || r.status >= 500));
const manual = results.filter((r) => [401, 403, 429].includes(r.status) || (byHandHost(r) && !(r.status >= 200 && r.status < 300)));
// The Publications Office always redirects a CELEX number to its storage address: not a move.
const EXPECTED_REDIRECTS = ["publications.europa.eu"];
const moved = results.filter((r) => r.status >= 200 && r.status < 300 && r.hops.length && strip(r.url) !== strip(r.finalUrl) && !EXPECTED_REDIRECTS.includes(new URL(r.url).host));

const { factsDates, freshness } = await import(pathToFileURL(join(skill, "scripts", "lib", "freshness.mjs")).href);
const facts = freshness(await factsDates(), new Date(), maxAge);
const checked = facts.checked;
const ageDays = facts.age_days;
const stale = facts.stale;
const ageOf = (d) => (d ? Math.floor((Date.now() - Date.parse(d)) / 86400000) : null);
const staleFiles = Object.entries(facts.files).filter(([, d]) => !d || ageOf(d) > maxAge);

const report = { checked, ageDays, maxAge, files: facts.files, staleFiles: staleFiles.map(([f]) => f), total: urls.length, gone, moved, manual };
if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`${urls.length} source URLs checked`);
  console.log(`Facts last checked (oldest file): ${checked ?? "no date found"}${ageDays !== null ? ` (${ageDays} days ago, limit ${maxAge})` : ""}`);
  for (const [f, d] of Object.entries(facts.files)) console.log(`  ${(d ?? "NO DATE").padEnd(10)}  ${f}${!d || ageOf(d) > maxAge ? "   <- re-check" : ""}`);
  console.log("");
  for (const r of gone) console.log(`GONE    ${r.status ?? r.error}  ${r.url}`);
  for (const r of moved) console.log(`MOVED   ${r.url}\n        → ${r.finalUrl}`);
  for (const r of manual) console.log(`BY HAND ${r.status}  ${r.url}  (blocks scripted requests: open it in a browser)`);
  if (!gone.length && !moved.length && !manual.length) console.log("All sources answer at their documented address.");
  if (stale) console.log(`\nFacts older than ${maxAge} days or undated in: ${staleFiles.map(([f]) => f).join(", ")}. Re-check their sources, update the facts, then the "Last checked" date of each file (and SKILL.md).`);
}
process.exit(gone.length || stale ? 1 : 0);
