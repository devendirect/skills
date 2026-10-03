#!/usr/bin/env node
// Freshness check for the skill's facts:
// - every URL in references/sources.md still answers (and where it moved),
// - the "last checked" date in SKILL.md is not too old.
//
// Usage: node check-sources.mjs [--max-age days] [--json]
//
// Exit 1 if a source is gone (404, 410, 5xx, network error) or the facts are
// older than --max-age (default 90 days). 401 / 403 / 429 are reported as
// "check by hand": some sites block scripted requests.
// Node 18+, no dependencies.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const skill = join(here, "..", "..", "plugins", "seo-geo-audit", "skills", "seo-geo-audit");
const UA = "Mozilla/5.0 (compatible; seo-geo-audit-source-check)";

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
const gone = results.filter((r) => r.status === null || r.status === 404 || r.status === 410 || r.status >= 500);
const manual = results.filter((r) => [401, 403, 429].includes(r.status));
const moved = results.filter((r) => r.status >= 200 && r.status < 300 && r.hops.length && strip(r.url) !== strip(r.finalUrl));

const skillMd = await readFile(join(skill, "SKILL.md"), "utf8");
const checked = skillMd.match(/last checked on \*\*(\d{4}-\d{2}-\d{2})\*\*/)?.[1] ?? null;
const ageDays = checked ? Math.floor((Date.now() - Date.parse(checked)) / 86400000) : null;
const stale = ageDays === null || ageDays > maxAge;

const report = { checked, ageDays, maxAge, total: urls.length, gone, moved, manual };
if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`${urls.length} source URLs checked`);
  console.log(`Facts last checked: ${checked ?? "date not found in SKILL.md"}${ageDays !== null ? ` (${ageDays} days ago, limit ${maxAge})` : ""}\n`);
  for (const r of gone) console.log(`GONE    ${r.status ?? r.error}  ${r.url}`);
  for (const r of moved) console.log(`MOVED   ${r.url}\n        → ${r.finalUrl}`);
  for (const r of manual) console.log(`BY HAND ${r.status}  ${r.url}  (blocks scripted requests: open it in a browser)`);
  if (!gone.length && !moved.length && !manual.length) console.log("All sources answer at their documented address.");
  if (stale) console.log(`\nThe facts are older than ${maxAge} days: re-check the sources, update the facts, then the date in SKILL.md.`);
}
process.exit(gone.length || stale ? 1 : 0);
