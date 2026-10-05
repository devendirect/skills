#!/usr/bin/env node
// Tests of the keep-up-to-date tooling:
// - lib/freshness.mjs: when a copy of the skill counts as too old;
// - run-all.mjs reports `facts`;
// - check-watch.mjs: due items, and issue creation against a mock GitHub API
//   (one issue per due item, none when an open issue already has the title).
//
// Usage: node test-maintenance.mjs
// Node 18+, no dependencies.

import http from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const run = promisify(execFile);
const here = fileURLToPath(new URL(".", import.meta.url));
const scripts = join(here, "..", "..", "plugins", "may-i-scrape", "skills", "may-i-scrape", "scripts");
const { freshness, factsDates } = await import(pathToFileURL(join(scripts, "lib", "freshness.mjs")).href);

let failed = 0;
let passed = 0;
const check = (label, ok, detail = "") => {
  if (ok) { passed++; console.log(`ok   ${label}`); } else { failed++; console.log(`FAIL ${label}${detail ? `: ${detail}` : ""}`); }
};

// --- freshness ---------------------------------------------------------------
const files = { "SKILL.md": "2026-10-04", "references/legal-eu.md": "2026-09-01" };
let f = freshness(files, new Date("2026-10-04T12:00:00Z"));
check("oldest file date counts", f.checked === "2026-09-01" && f.age_days === 33 && !f.stale, JSON.stringify(f));
f = freshness(files, new Date("2027-03-04T00:00:00Z"));
check("stale after 183 days", f.stale && f.age_days === 184, JSON.stringify(f));
f = freshness({ ...files, "references/legal-uk.md": null }, new Date("2026-10-04T00:00:00Z"));
check("a missing date makes the copy stale", f.stale && f.missing.includes("references/legal-uk.md"));
f = freshness(files, new Date("2026-10-04T00:00:00Z"), 10);
check("custom limit (CI uses 90)", f.stale);
const real = await factsDates();
check("the real skill has a date in SKILL.md and every legal-*.md", Object.keys(real).length >= 6 && Object.values(real).every(Boolean), JSON.stringify(real));

// --- run-all reports facts ---------------------------------------------------
const { analyze } = await import(pathToFileURL(join(scripts, "run-all.mjs")).href);
const report = await analyze("https://offline.example/", { purpose: "lookup", offline: { robots: "User-agent: *\nAllow: /\n", page: null, headers: {}, terms: null } });
check("run-all report has facts", report.facts && typeof report.facts.stale === "boolean" && report.facts.checked, JSON.stringify(report.facts));

// --- check-watch -------------------------------------------------------------
const dir = await mkdtemp(join(tmpdir(), "watch-"));
const watchFile = join(dir, "watch.json");
await writeFile(watchFile, JSON.stringify({ items: [
  { id: "past", due: "2026-01-01", title: "Past item", what: "x", where: ["https://example.org"], files: ["references/legal-eu.md"] },
  { id: "known", due: "2026-02-01", title: "Already reported", what: "x", where: [], files: [] },
  { id: "future", due: "2099-01-01", title: "Future item", what: "x", where: [], files: [] },
] }));
const watch = join(here, "check-watch.mjs");

const { stdout: listed } = await run(process.execPath, [watch, "--file", watchFile, "--today", "2026-06-01", "--json"]);
const l = JSON.parse(listed);
check("due items are listed, future ones are not", l.due.map((i) => i.id).join() === "past,known" && l.upcoming.map((i) => i.id).join() === "future");

// Mock GitHub API: one open issue already has the "known" title.
const posted = [];
const server = http.createServer((req, res) => {
  let data = "";
  req.on("data", (c) => (data += c)).on("end", () => {
    res.setHeader("content-type", "application/json");
    if (req.headers.authorization !== "Bearer test-token") { res.statusCode = 401; return res.end("{}"); }
    if (req.method === "GET" && req.url.startsWith("/repos/o/r/issues")) return res.end(JSON.stringify([{ title: "[may-i-scrape] Legal watch: Already reported" }]));
    if (req.method === "POST" && req.url === "/repos/o/r/issues") { posted.push(JSON.parse(data)); return res.end(JSON.stringify({ html_url: "https://github.com/o/r/issues/1" })); }
    res.statusCode = 404; res.end("{}");
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
try {
  const env = { ...process.env, GITHUB_TOKEN: "test-token", GITHUB_REPOSITORY: "o/r", GITHUB_API_URL: `http://127.0.0.1:${server.address().port}` };
  const { stdout } = await run(process.execPath, [watch, "--file", watchFile, "--today", "2026-06-01", "--create-issues", "--json"], { env });
  const out = JSON.parse(stdout);
  check("one issue opened for the new due item", posted.length === 1 && posted[0].title === "[may-i-scrape] Legal watch: Past item" && out.created.length === 1, JSON.stringify(posted));
  check("no duplicate when an open issue has the same title", out.existing.join() === "known");
  check("issue body names the files to update", posted[0]?.body.includes("plugins/may-i-scrape/skills/may-i-scrape/references/legal-eu.md"));
} finally {
  server.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
