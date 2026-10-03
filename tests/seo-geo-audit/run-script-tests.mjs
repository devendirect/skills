#!/usr/bin/env node
// Runs the skill's scripts against every servable fixture and checks their
// findings against the fixture's expected.json.
//
// Usage: node run-script-tests.mjs [fixture name ...]
//
// expected.json: { "checks": [ {
//   "script": "check-live" | "robots-check",
//   "path": "/page/",              URL path on the fixture server, or
//   "file": "logs/access.log",     a file in the fixture (scripts that read files)
//   "argsBefore": ["csv"],         arguments before the target (sub-command)
//   "args": ["--no-site"],         extra arguments
//   "mustFind": ["regex"],         each must match at least one finding
//   "mustNotFind": ["regex"],      none may match a finding
//   "maxFindings": 0,              upper bound on the number of findings
//   "jsonMust": ["regex"]          each must match the raw --json output
// } ] }
// Findings = "findings" for check-live, "warnings" for robots-check.

import { readdir, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { start, loadFixture } from "./serve.mjs";

const run = promisify(execFile);
const here = fileURLToPath(new URL(".", import.meta.url));
const scripts = join(here, "..", "..", "plugins", "seo-geo-audit", "skills", "seo-geo-audit", "scripts");

const only = process.argv.slice(2);
const names = (await readdir(join(here, "fixtures"))).filter((n) => !only.length || only.includes(n)).sort();

let failed = 0;
let passed = 0;

for (const name of names) {
  const { dir, config } = await loadFixture(name);
  let expected;
  try {
    expected = JSON.parse(await readFile(join(dir, "expected.json"), "utf8"));
  } catch {
    console.log(`- ${name}: no expected.json, skipped (skill-level checks only, see expected.md)`);
    continue;
  }
  const needsServer = expected.checks.some((c) => c.path);
  if (needsServer && !config.port) {
    console.log(`- ${name}: checks need a server but the fixture has no port, skipped`);
    continue;
  }

  const { server, url } = needsServer ? await start(name) : { server: null, url: null };
  console.log(`\n# ${name}${url ? ` (${url})` : ""}`);
  try {
    for (const check of expected.checks) {
      const file = join(scripts, `${check.script}.mjs`);
      const target = check.file ? join(dir, check.file) : url + check.path;
      const label = `${check.script} ${check.file ?? check.path} ${(check.args ?? []).join(" ")}`.trim();
      let raw;
      try {
        ({ stdout: raw } = await run(process.execPath, [file, ...(check.argsBefore ?? []), target, ...(check.args ?? []), "--json"], { maxBuffer: 10 * 1024 * 1024 }));
      } catch (e) {
        console.log(`  FAIL ${label}: script error\n       ${(e.stderr || e.message).trim()}`);
        failed++;
        continue;
      }
      const report = JSON.parse(raw);
      const findings = report.findings ?? report.warnings ?? [];
      const errors = [];
      for (const re of check.mustFind ?? []) {
        if (!findings.some((f) => new RegExp(re, "i").test(f))) errors.push(`missing finding /${re}/`);
      }
      for (const re of check.mustNotFind ?? []) {
        const hit = findings.find((f) => new RegExp(re, "i").test(f));
        if (hit) errors.push(`unexpected finding /${re}/: "${hit}"`);
      }
      if (check.maxFindings !== undefined && findings.length > check.maxFindings) {
        errors.push(`${findings.length} findings, expected at most ${check.maxFindings}`);
      }
      for (const re of check.jsonMust ?? []) {
        if (!new RegExp(re).test(raw)) errors.push(`JSON output does not match /${re}/`);
      }
      if (errors.length) {
        failed++;
        console.log(`  FAIL ${label}`);
        for (const e of errors) console.log(`       - ${e}`);
        if (findings.length) console.log(`       findings: ${findings.map((f) => `"${f}"`).join(", ")}`);
      } else {
        passed++;
        console.log(`  ok   ${label} (${findings.length} finding${findings.length === 1 ? "" : "s"})`);
      }
    }
  } finally {
    server?.close();
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
