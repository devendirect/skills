#!/usr/bin/env node
// Which AI and search crawlers does a robots.txt let in?
//
// Usage:
//   node robots-check.mjs <site URL | robots.txt URL | local file> [--path /some/page ...] [--json]
//
// Matching follows RFC 9309: a crawler uses the group(s) whose user-agent equals
// its token (case-insensitive), else the "*" group; within a group the longest
// matching rule wins, and Allow wins a tie. Supports "*" and "$" in paths.
// Node 18+, no dependencies.

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { parse, groupsFor, decide } from "./lib/robots.mjs";

const UA = "seo-geo-audit (Claude Code skill; audit run by the site owner)";
const here = new URL(".", import.meta.url);

function usage() {
  console.error("usage: node robots-check.mjs <site URL | robots.txt URL | file> [--path /p ...] [--json]");
  process.exit(2);
}

// Git Bash on Windows rewrites "/admin" into "C:/Program Files/Git/admin".
// Accept "admin" (leading slash added) and refuse rewritten paths.
function normalizePath(p) {
  if (/^[A-Za-z]:[\\/]/.test(p)) {
    console.error(`error: "${p}" looks like a path rewritten by Git Bash. Write it without the leading slash (--path admin/page) or set MSYS_NO_PATHCONV=1.`);
    process.exit(2);
  }
  if (p === "" || p === ".") return "/";
  return p.startsWith("/") || p.startsWith("*") ? p : "/" + p;
}

const args = process.argv.slice(2);
const json = args.includes("--json");
const paths = [];
let target;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--json") continue;
  if (args[i] === "--path") { paths.push(normalizePath(args[++i] ?? usage())); continue; }
  if (target) usage();
  target = args[i];
}
if (!target) usage();
if (paths.length === 0) paths.push("/");

const crawlers = JSON.parse(await readFile(new URL("ai-crawlers.json", here), "utf8"));

// --- load robots.txt -------------------------------------------------------

async function load(target) {
  if (!/^https?:\/\//i.test(target)) {
    if (!existsSync(target)) throw new Error(`not a URL and no such file: ${target}`);
    return { source: target, status: null, text: await readFile(target, "utf8") };
  }
  const u = new URL(target);
  if (!u.pathname.endsWith("/robots.txt")) u.pathname = "/robots.txt";
  u.search = ""; u.hash = "";
  const res = await fetch(u, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(15000) });
  return { source: u.href, finalUrl: res.url, status: res.status, text: res.ok ? await res.text() : "" };
}

// --- run -------------------------------------------------------------------

let robots;
try {
  robots = await load(target);
} catch (e) {
  console.error(`error: ${e.message}${e.cause?.code ? ` (${e.cause.code})` : ""}`);
  process.exit(1);
}

const { groups, sitemaps } = parse(robots.text);
const declared = new Set(groups.flatMap((g) => g.agents));

const results = crawlers.agents.map((a) => {
  const { matched, rules } = groupsFor(a.token, groups);
  const checks = paths.map((p) => ({ path: p, ...decide(p, rules) }));
  const blockedAll = checks.every((c) => !c.allowed);
  const blockedSome = checks.some((c) => !c.allowed);
  const restricted = rules.some((r) => !r.allow);
  const status = blockedAll ? "blocked" : blockedSome ? "partial" : restricted ? "allowed (with restrictions)" : "allowed";
  return { ...a, group: matched, status, checks };
});

const warnings = [];
if (robots.status !== null && robots.status >= 500) warnings.push(`robots.txt answered ${robots.status}: crawlers may treat the whole site as blocked until it recovers.`);
if (robots.status !== null && robots.status >= 400 && robots.status < 500) warnings.push(`robots.txt answered ${robots.status}: crawlers treat this as "no restrictions".`);
for (const d of crawlers.deprecated) {
  if (declared.has(d.token.toLowerCase())) warnings.push(`Rule on deprecated token "${d.token}" (${d.operator}) has no effect; use ${d.replacedBy}.`);
}
// Search and user-fetch agents blocked somewhere, grouped by (group, blocked paths)
// so one "*" rule gives one warning, not fifteen.
const blockedVisible = new Map();
for (const r of results) {
  if (r.family !== "search" && r.family !== "user") continue;
  const where = r.checks.filter((c) => !c.allowed).map((c) => c.path);
  if (!where.length) continue;
  const key = `${r.group}|${where.join(",")}`;
  if (!blockedVisible.has(key)) blockedVisible.set(key, { group: r.group, where, tokens: [] });
  blockedVisible.get(key).tokens.push(r.token);
}
for (const { group, where, tokens } of blockedVisible.values()) {
  const who = tokens.length === 1 ? tokens[0] : `${tokens.length} search / user-fetch agents (${tokens.join(", ")})`;
  const by = group === "*" ? ` by the "*" group` : "";
  warnings.push(where.includes("/")
    ? `${who} blocked from the whole site${by}: the site is invisible to ${tokens.length === 1 ? "it" : "them"}.`
    : `${who} blocked on ${where.join(", ")}${by}. Intended?`);
}
const unknown = [...declared].filter((t) => t !== "*" && !crawlers.agents.some((a) => a.token.toLowerCase() === t) && !crawlers.deprecated.some((d) => d.token.toLowerCase() === t));

const report = { source: robots.source, finalUrl: robots.finalUrl, status: robots.status, checked: crawlers.checked, paths, sitemaps, results, warnings, otherAgentsDeclared: unknown };

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`robots.txt: ${robots.source}${robots.status !== null ? ` (HTTP ${robots.status})` : ""}`);
  if (robots.finalUrl && robots.finalUrl !== robots.source) console.log(`redirected to: ${robots.finalUrl}`);
  console.log(`paths checked: ${paths.join(", ")}   crawler list checked: ${crawlers.checked}`);
  console.log(`sitemaps declared: ${sitemaps.length ? sitemaps.join(", ") : "none"}\n`);
  const order = ["search", "user", "mixed", "training", "other"];
  for (const fam of order) {
    const rows = results.filter((r) => r.family === fam);
    if (!rows.length) continue;
    console.log(`## ${crawlers.families[fam]}`);
    for (const r of rows) {
      const why = r.checks.filter((c) => c.by).map((c) => `${c.path} → ${c.by}`).join("; ");
      console.log(`  ${r.status.padEnd(28)} ${r.token.padEnd(20)} ${r.operator.padEnd(13)} group: ${r.group ?? "none"}${why ? `   [${why}]` : ""}`);
    }
    console.log("");
  }
  if (unknown.length) console.log(`Other user-agents declared: ${unknown.join(", ")}\n`);
  console.log(warnings.length ? "Warnings:\n" + warnings.map((w) => `  - ${w}`).join("\n") : "Warnings: none");
}
