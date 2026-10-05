#!/usr/bin/env node
// Runs run-all.mjs against every fixture and checks the verdicts against the
// fixture's expected.json. Each check runs twice and both reports must be
// identical (stable verdicts). No fixture may ever get a green verdict
// without a positive signal.
//
// The fixtures pretend to be real hosts (fixture.json "host"): analyze() gets
// a fetch that sends those requests to the local server instead.
//
// Usage: node run-script-tests.mjs [fixture name ...]
//
// expected.json: { "checks": [ {
//   "path": "/page.html",                       path on the fake host
//   "options": { "purpose": "bulk", "agent": "mybot", "volume": "2000", "personalData": "likely" },
//   "verdicts":   { "<purpose>": "red|orange|green" },
//   "reasons":    { "<purpose>": ["R1", …] },    codes that must be among the reasons
//   "notReasons": { "<purpose>": ["O8", …] },    codes that must not
//   "positives":  { "<purpose>": ["G1", …] },
//   "covered":    { "<purpose>": ["O4", …] },
//   "signals":    { "tdm.reserved": true, … },   dotted path in report.signals -> exact value
//   "notRequested": ["/private/"],               paths the skill must not have read
//   "clauses": 1,                                number of clauses extracted from the terms
//   "noRequests": true                           offline checks: nothing may be sent
// } ] }
// Extra options: "classifyAll": "prohibited" (or { "<purpose>": label }) labels
// every extracted clause, as the model would, and runs again; "offline":
// { "robots": "file", "page": "file", "headers": "file", "terms": "file" },
// files in the fixture folder.
// Node 18+, no dependencies.

import { readdir, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { start, loadFixture } from "./serve.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const scripts = join(here, "..", "..", "plugins", "may-i-scrape", "skills", "may-i-scrape", "scripts");
const { analyze, parseVolume, parseHeaders } = await import(pathToFileURL(join(scripts, "run-all.mjs")).href);

const only = process.argv.slice(2);
const names = (await readdir(join(here, "fixtures"))).filter((n) => !only.length || only.includes(n)).sort();
let passed = 0;
let failed = 0;

const get = (obj, dotted) => dotted.split(".").reduce((o, k) => o?.[k], obj);
const stable = (report) => JSON.stringify({ ...report, checked_on: null });

for (const name of names) {
  const { dir } = await loadFixture(name);
  const expected = JSON.parse(await readFile(join(dir, "expected.json"), "utf8"));
  const { server, config, seen, url: local } = await start(name);
  const fakeFetch = (url, init) => {
    const u = new URL(url);
    if (u.origin !== new URL(config.host).origin) throw new TypeError(`test fetch: unexpected host ${u.origin}`);
    return fetch(local + u.pathname + u.search, init);
  };
  console.log(`\n# ${name} (${config.host})`);
  try {
    for (const check of expected.checks) {
      const { offline, classifyAll, ...rest } = check.options ?? {};
      const opts = { ...rest, volume: rest.volume ? parseVolume(rest.volume) : null };
      if (offline) {
        const read = async (f) => (f ? readFile(join(dir, f), "utf8") : null);
        opts.offline = { robots: await read(offline.robots), page: await read(offline.page), headers: parseHeaders(await read(offline.headers)), terms: await read(offline.terms) };
      }
      const label = `${check.path} ${JSON.stringify(check.options ?? {})}`;
      const errors = [];
      // The model's two steps: a first run extracts the clauses, then every
      // clause gets the label given in classifyAll and the script runs again.
      if (classifyAll) {
        const first = await analyze(config.host + check.path, opts, { fetch: fakeFetch, pause: 0 });
        opts.classification = Object.fromEntries(first.signals.terms.clauses.map((c) => [c.id, classifyAll]));
        if (!first.signals.terms.clauses.length) errors.push("classifyAll given but no clause was extracted");
      }
      seen.length = 0;
      const report = await analyze(config.host + check.path, opts, { fetch: fakeFetch, pause: 0 });
      const paths = [...seen];
      const again = await analyze(config.host + check.path, opts, { fetch: fakeFetch, pause: 0 });

      if (check.clauses !== undefined && report.signals.terms.clauses.length !== check.clauses) {
        errors.push(`${report.signals.terms.clauses.length} clause(s) extracted, expected ${check.clauses}: ${report.signals.terms.clauses.map((c) => `"${c.quote.slice(0, 60)}"`).join(", ")}`);
      }
      if (check.noRequests && report.requests.length) errors.push(`sent ${report.requests.length} request(s) although offline`);
      if (stable(report) !== stable(again)) errors.push("two runs gave different reports");
      const by = Object.fromEntries(report.verdicts.map((v) => [v.purpose, v]));
      for (const v of report.verdicts) {
        if (v.verdict === "green" && !v.positives.length) errors.push(`${v.purpose}: green without a positive signal`);
      }
      for (const [p, color] of Object.entries(check.verdicts ?? {})) {
        if (by[p]?.verdict !== color) errors.push(`${p}: ${by[p]?.verdict} instead of ${color} (${by[p]?.reasons.map((r) => r.code).join(", ")})`);
      }
      const codes = (list) => list.map((x) => x.code);
      for (const [field, key, must] of [["reasons", "reasons", true], ["notReasons", "reasons", false], ["positives", "positives", true], ["covered", "covered", true]]) {
        for (const [p, want] of Object.entries(check[field] ?? {})) {
          const have = codes(by[p]?.[key] ?? []);
          for (const c of want) if (have.includes(c) !== must) errors.push(`${p}: ${key} ${must ? "lacks" : "has"} ${c} (has ${have.join(", ") || "none"})`);
        }
      }
      for (const [path, value] of Object.entries(check.signals ?? {})) {
        const have = get(report.signals, path);
        if (JSON.stringify(have) !== JSON.stringify(value)) errors.push(`signals.${path} = ${JSON.stringify(have)}, expected ${JSON.stringify(value)}`);
      }
      for (const p of check.notRequested ?? []) if (paths.some((s) => s.startsWith(p))) errors.push(`read ${p} although it should not`);

      if (errors.length) {
        failed++;
        console.log(`  FAIL ${label}`);
        for (const e of errors) console.log(`       - ${e}`);
      } else {
        passed++;
        console.log(`  ok   ${label}  ${report.verdicts.map((v) => `${v.purpose}=${v.verdict}`).join(" ")}`);
      }
    }
  } finally {
    server.close();
  }
}

// The command line itself, once, against a fixture served on a real port.
{
  const { server, url } = await start(names.includes("01-nothing") ? "01-nothing" : names[0]);
  try {
    const { stdout } = await promisify(execFile)(process.execPath, [join(scripts, "run-all.mjs"), url + "/", "--purpose", "lookup", "--json"]);
    const r = JSON.parse(stdout);
    if (r.schema === 2 && r.verdicts.length === 1 && r.disclaimer) { passed++; console.log("\n# CLI\n  ok   run-all.mjs --json"); }
    else { failed++; console.log("\n# CLI\n  FAIL run-all.mjs --json: unexpected output"); }
  } catch (e) {
    failed++;
    console.log(`\n# CLI\n  FAIL run-all.mjs: ${(e.stderr || e.message).trim()}`);
  } finally {
    server.close();
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
