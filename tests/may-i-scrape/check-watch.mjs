#!/usr/bin/env node
// Lists the watch items (watch.json) whose date has passed: a decision that
// should now be out, a pending case to re-check, the periodic legal review.
//
// Usage:
//   node check-watch.mjs [--today YYYY-MM-DD] [--json]
//   node check-watch.mjs --create-issues      (CI: needs GITHUB_TOKEN and
//                                              GITHUB_REPOSITORY)
//
// --create-issues opens one GitHub issue per due item, unless an open issue
// with the same title already exists. Always exits 0 when it could run: a due
// item is work to do, not a broken build. Node 18+, no dependencies.

import { readFile } from "node:fs/promises";

const args = process.argv.slice(2);
const json = args.includes("--json");
const createIssues = args.includes("--create-issues");
const t = args.indexOf("--today");
const today = t >= 0 ? args[t + 1] : new Date().toISOString().slice(0, 10);
const f = args.indexOf("--file");
const file = f >= 0 ? args[f + 1] : new URL("watch.json", import.meta.url);
if (!/^\d{4}-\d{2}-\d{2}$/.test(today ?? "")) {
  console.error("usage: node check-watch.mjs [--today YYYY-MM-DD] [--file watch.json] [--json] [--create-issues]");
  process.exit(2);
}

const PREFIX = "[may-i-scrape] Legal watch: ";
const { items } = JSON.parse(await readFile(file, "utf8"));
for (const it of items) {
  if (!it.id || !/^\d{4}-\d{2}-\d{2}$/.test(it.due ?? "") || !it.title) {
    console.error(`error: bad watch item ${JSON.stringify(it).slice(0, 120)}`);
    process.exit(1);
  }
}
const due = items.filter((it) => it.due <= today).sort((a, b) => a.due.localeCompare(b.due));
const upcoming = items.filter((it) => it.due > today).sort((a, b) => a.due.localeCompare(b.due));

const body = (it) => [
  `Due since **${it.due}** (from \`tests/may-i-scrape/watch.json\`, id \`${it.id}\`).`,
  "",
  it.what,
  "",
  "**Where to check**",
  ...it.where.map((w) => `- ${w}`),
  "",
  "**Files to update**",
  ...it.files.map((x) => `- \`plugins/may-i-scrape/skills/may-i-scrape/${x}\``),
  "",
  "When done: update the facts and their dates, then move this item's date forward in watch.json or delete it. Never state anything that was not read at an official source; keep it *(to verify)* otherwise.",
].join("\n");

async function github(path, init = {}) {
  // GITHUB_API_URL is set by GitHub Actions; tests point it at a local mock.
  const res = await fetch(`${process.env.GITHUB_API_URL ?? "https://api.github.com"}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: "application/vnd.github+json", "user-agent": "may-i-scrape-watch", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`GitHub API ${init.method ?? "GET"} ${path}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

let created = [];
let existing = [];
if (createIssues && due.length) {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!process.env.GITHUB_TOKEN || !repo) {
    console.error("error: --create-issues needs GITHUB_TOKEN and GITHUB_REPOSITORY");
    process.exit(1);
  }
  const open = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await github(`/repos/${repo}/issues?state=open&per_page=100&page=${page}`);
    open.push(...batch);
    if (batch.length < 100) break;
  }
  const titles = new Set(open.map((i) => i.title));
  for (const it of due) {
    const title = PREFIX + it.title;
    if (titles.has(title)) { existing.push(it.id); continue; }
    const issue = await github(`/repos/${repo}/issues`, { method: "POST", body: JSON.stringify({ title, body: body(it) }) });
    created.push({ id: it.id, url: issue.html_url });
  }
}

if (json) {
  console.log(JSON.stringify({ today, due, upcoming, created, existing }, null, 2));
} else {
  console.log(`Watch list, ${today}: ${due.length} due, ${upcoming.length} upcoming\n`);
  for (const it of due) console.log(`DUE      ${it.due}  ${it.title}\n         ${it.files.join("; ")}`);
  for (const it of upcoming) console.log(`upcoming ${it.due}  ${it.title}`);
  for (const c of created) console.log(`\nissue opened: ${c.url}`);
  if (existing.length) console.log(`\nalready open: ${existing.join(", ")}`);
}
