#!/usr/bin/env node
// Which search and AI crawlers visit a site, and how many visitors AI
// assistants send, from web server access logs.
//
// Usage:
//   node log-bots.mjs <access.log> [more files ...] [--top N] [--json]
//
// Reads Apache / Nginx "combined" logs (plain or .gz). Matches user agents
// against ai-crawlers.json, and referrers against AI assistant domains.
// User agents can be faked: for decisions that matter, verify the IPs against
// the ranges each operator publishes. Output is aggregated: no IP addresses.
// Node 18+, no dependencies.

import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";

const here = new URL(".", import.meta.url);
const args = process.argv.slice(2);
const json = args.includes("--json");
let top = 5;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--json") continue;
  if (args[i] === "--top") { top = Number(args[++i]); continue; }
  files.push(args[i]);
}
if (!files.length || !Number.isFinite(top)) {
  console.error("usage: node log-bots.mjs <access.log> [more files ...] [--top N] [--json]");
  process.exit(2);
}

const crawlers = JSON.parse(await readFile(new URL("ai-crawlers.json", here), "utf8"));
// Longest tokens first, so "Googlebot-Image" style variants and "Applebot"
// vs "Applebot-Extended" do not steal each other's hits.
const agents = crawlers.agents.filter((a) => !a.robotsOnly).sort((a, b) => b.token.length - a.token.length);
const AI_REFERRERS = ["chatgpt.com", "chat.openai.com", "perplexity.ai", "claude.ai", "copilot.microsoft.com", "gemini.google.com"];

// combined: ip ident user [date] "METHOD path PROTO" status bytes "referer" "ua"
const LINE = /^(\S+) \S+ \S+ \[([^\]]+)\] "(?:(\S+) (\S+)[^"]*|[^"]*)" (\d{3}) \S+(?: "([^"]*)" "([^"]*)")?/;
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
function parseDate(s) {
  const m = s.match(/^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})$/);
  if (!m) return null;
  const off = (m[7][0] === "-" ? -1 : 1) * (Number(m[7].slice(1, 3)) * 60 + Number(m[7].slice(3)));
  return new Date(Date.UTC(m[3], MONTHS[m[2]], m[1], m[4], m[5], m[6]) - off * 60000);
}

const stats = new Map(); // token -> { hits, first, last, status: {}, paths: Map }
const referrals = new Map(); // domain -> { visits, paths: Map }
let lines = 0, parsed = 0, noUa = 0, first = null, last = null;

function bump(map, key) { map.set(key, (map.get(key) ?? 0) + 1); }

for (const file of files) {
  let input = createReadStream(file);
  if (file.endsWith(".gz")) input = input.pipe(createGunzip());
  input.on("error", (e) => { console.error(`error: ${file}: ${e.message}`); process.exit(1); });
  for await (const line of createInterface({ input, crlfDelay: Infinity })) {
    lines++;
    const m = line.match(LINE);
    if (!m) continue;
    parsed++;
    const [, , date, , path = "?", status, referer = "", ua] = m;
    const when = parseDate(date);
    if (when) {
      if (!first || when < first) first = when;
      if (!last || when > last) last = when;
    }
    if (ua === undefined) { noUa++; continue; }
    const uaLower = ua.toLowerCase();
    const agent = agents.find((a) => uaLower.includes(a.token.toLowerCase()));
    if (agent) {
      const s = stats.get(agent.token) ?? { hits: 0, first: null, last: null, status: {}, paths: new Map() };
      s.hits++;
      if (when && (!s.first || when < s.first)) s.first = when;
      if (when && (!s.last || when > s.last)) s.last = when;
      const cls = `${status[0]}xx`;
      s.status[cls] = (s.status[cls] ?? 0) + 1;
      bump(s.paths, path);
      stats.set(agent.token, s);
      continue;
    }
    const ref = AI_REFERRERS.find((d) => referer.includes(`://${d}`) || referer.includes(`.${d}`));
    if (ref) {
      const r = referrals.get(ref) ?? { visits: 0, paths: new Map() };
      r.visits++;
      bump(r.paths, path);
      referrals.set(ref, r);
    }
  }
}

const topPaths = (map) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, top).map(([path, hits]) => ({ path, hits }));
const day = (d) => (d ? d.toISOString().slice(0, 10) : null);

const bots = crawlers.agents.map((a) => {
  if (a.robotsOnly) return { token: a.token, operator: a.operator, family: a.family, robotsOnly: true };
  const s = stats.get(a.token);
  return s
    ? { token: a.token, operator: a.operator, family: a.family, hits: s.hits, first: day(s.first), last: day(s.last), status: s.status, topPaths: topPaths(s.paths) }
    : { token: a.token, operator: a.operator, family: a.family, hits: 0 };
});

const findings = [];
if (parsed === 0) findings.push("No line matched the Apache / Nginx log format: check the file, or the log format configured on the server.");
if (noUa > 0 && noUa === parsed) findings.push("The log has no user-agent field (common format, not combined): crawlers cannot be identified. Switch the server to the combined format.");
for (const b of bots) {
  if (b.robotsOnly || !b.hits) continue;
  const errors = (b.status["4xx"] ?? 0) + (b.status["5xx"] ?? 0);
  if (errors / b.hits > 0.2) findings.push(`${b.token}: ${errors} of ${b.hits} requests got a 4xx/5xx answer.`);
}
const seenSearch = bots.filter((b) => b.family === "search" && b.hits);
if (parsed > 0 && !bots.find((b) => b.token === "Googlebot")?.hits) findings.push("No Googlebot visit in this period: check that the site is indexable and known to Search Console (or the period is too short).");
if (parsed > 0 && seenSearch.length && !seenSearch.some((b) => b.operator !== "Google" && b.operator !== "Microsoft")) {
  findings.push("No AI search crawler (OAI-SearchBot, Claude-SearchBot, PerplexityBot…) in this period.");
}

const report = {
  files, lines, parsed, period: { from: day(first), to: day(last) }, checked: crawlers.checked,
  bots, aiReferrals: [...referrals.entries()].map(([domain, r]) => ({ domain, visits: r.visits, topPaths: topPaths(r.paths) })),
  findings,
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`# ${files.join(", ")}`);
  console.log(`${parsed} of ${lines} lines parsed, from ${report.period.from ?? "?"} to ${report.period.to ?? "?"}\n`);
  const order = ["search", "user", "mixed", "training", "other"];
  for (const fam of order) {
    const rows = bots.filter((b) => b.family === fam);
    if (!rows.length) continue;
    console.log(`## ${crawlers.families[fam]}`);
    for (const b of rows) {
      if (b.robotsOnly) { console.log(`  ${b.token.padEnd(20)} robots.txt token only, never in logs`); continue; }
      if (!b.hits) { console.log(`  ${b.token.padEnd(20)} 0`); continue; }
      const st = Object.entries(b.status).map(([k, v]) => `${k} ${v}`).join(", ");
      console.log(`  ${b.token.padEnd(20)} ${String(b.hits).padStart(6)} hits  ${b.first} → ${b.last}  [${st}]`);
      console.log(`  ${"".padEnd(20)} top: ${b.topPaths.map((p) => `${p.path} (${p.hits})`).join(", ")}`);
    }
    console.log("");
  }
  console.log("## Visitors sent by AI assistants (referrer)");
  if (!report.aiReferrals.length) console.log("  none in this period");
  for (const r of report.aiReferrals) console.log(`  ${r.domain.padEnd(24)} ${r.visits} visits  top: ${r.topPaths.map((p) => `${p.path} (${p.hits})`).join(", ")}`);
  console.log(`\n## Findings (${findings.length})`);
  console.log(findings.length ? findings.map((f) => `  - ${f}`).join("\n") : "  none");
  console.log("\nUser agents can be faked: verify IPs against each operator's published ranges before acting on a surprising number.");
}
