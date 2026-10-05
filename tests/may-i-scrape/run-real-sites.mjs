#!/usr/bin/env node
// Phase 3: runs run-all.mjs on the real-site test set (real-sites/sites.json)
// and compares the verdicts with the expectations written before the runs.
//
// Usage:
//   node run-real-sites.mjs record --cache DIR [id ...]
//       two network runs per site (stability), responses of the second run
//       saved in DIR (one file per site); prints the clauses to classify
//   node run-real-sites.mjs replay --cache DIR [--classify FILE] [--out FILE] [id ...]
//       no network: replays the saved responses, applies the classification
//       ({ "<site id>": { "<clause id>": "<label>" } }), compares with the
//       expectations, writes a Markdown summary
//
// Polite: the skill's own client (one request at a time, 1 s pause,
// robots.txt respected), and the sites are visited one after the other.
// Not run in CI. Node 18+, no dependencies.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));

// Sends requests to third-party sites: never run on import.
if (!process.argv[1] || fileURLToPath(import.meta.url) !== resolve(process.argv[1])) {
  throw new Error("run-real-sites.mjs is a command, not a module: run it with node");
}
const scripts = join(here, "..", "..", "plugins", "may-i-scrape", "skills", "may-i-scrape", "scripts");
const { analyze } = await import(pathToFileURL(join(scripts, "run-all.mjs")).href);
const { sites } = JSON.parse(await readFile(join(here, "real-sites", "sites.json"), "utf8"));

const args = process.argv.slice(2);
const mode = args.shift();
const opt = (name) => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const cache = opt("--cache");
const classifyFile = opt("--classify");
const outFile = opt("--out");
const only = args;
if (!["record", "replay"].includes(mode) || !cache) {
  console.error("usage: node run-real-sites.mjs record|replay --cache DIR [--classify FILE] [--out FILE] [id ...]");
  process.exit(2);
}
await mkdir(cache, { recursive: true });
const selected = sites.filter((s) => !only.length || only.includes(s.id));
const urlKey = (u) => String(u);

// fetch that records every response (status, headers, body) for replay.
function recordingFetch(store) {
  return async (url, init) => {
    const res = await fetch(url, init);
    const body = Buffer.from(await res.arrayBuffer());
    store[urlKey(url)] = { status: res.status, headers: Object.fromEntries(res.headers), body: body.toString("base64") };
    return new Response(res.status === 204 || res.status === 304 ? null : body, { status: res.status, headers: res.headers });
  };
}
function replayFetch(store) {
  return async (url) => {
    const r = store[urlKey(url)];
    if (!r) throw new TypeError(`replay: no recorded response for ${url}`);
    const body = Buffer.from(r.body, "base64");
    const headers = new Headers();
    for (const [k, v] of Object.entries(r.headers)) { try { headers.set(k, v); } catch {} }
    return new Response(r.status === 204 || r.status === 304 ? null : body, { status: r.status, headers });
  };
}

const optsFor = (s) => ({ purpose: s.purpose, personalData: s.personalData ? "likely" : null });
const codes = (v) => v.reasons.map((r) => r.code).concat(v.positives.map((p) => "+" + p.code));
const summaryOf = (report) => {
  const v = report.verdicts[0];
  return { verdict: v.verdict, codes: codes(v), clauses: report.signals.terms.clauses.map((c) => c.id), requests: report.requests.length };
};

if (mode === "record") {
  for (const s of selected) {
    const file = join(cache, `${s.id}.json`);
    process.stdout.write(`${s.id.padEnd(26)} `);
    try {
      const first = await analyze(s.url, optsFor(s));
      const store = {};
      const second = await analyze(s.url, optsFor(s), { fetch: recordingFetch(store) });
      const a = summaryOf(first);
      const b = summaryOf(second);
      // Stable = same verdict, codes and clause ids; the number of requests may vary (rate limits, redirects).
      const key = (x) => JSON.stringify({ verdict: x.verdict, codes: x.codes, clauses: x.clauses });
      const stable = key(a) === key(b);
      await writeFile(file, JSON.stringify({ site: s, recorded: new Date().toISOString(), runs: [a, b], stable, store, clauses: second.signals.terms.clauses }, null, 1));
      console.log(`${b.verdict.padEnd(7)} ${stable ? "stable  " : "UNSTABLE"} ${b.codes.join(" ")}  (${b.requests} req, ${b.clauses.length} clause(s))`);
    } catch (e) {
      await writeFile(file, JSON.stringify({ site: s, error: e.message }));
      console.log(`ERROR ${e.message}`);
    }
  }
}

if (mode === "replay") {
  const classification = classifyFile ? JSON.parse(await readFile(classifyFile, "utf8")) : {};
  const rows = [];
  for (const s of selected) {
    const file = join(cache, `${s.id}.json`);
    if (!existsSync(file)) { rows.push({ s, error: "not recorded" }); continue; }
    const rec = JSON.parse(await readFile(file, "utf8"));
    if (rec.error) { rows.push({ s, error: rec.error }); continue; }
    const before = rec.runs[1];
    const report = await analyze(s.url, { ...optsFor(s), classification: classification[s.id] ?? {} }, { fetch: replayFetch(rec.store), pause: 0 });
    const after = summaryOf(report);
    const unclassified = report.signals.terms.clauses.filter((c) => !(classification[s.id] ?? {})[c.id]).length;
    rows.push({ s, stable: rec.stable, before, after, unclassified, ok: after.verdict === s.expected, falseGreen: after.verdict === "green" && s.expected !== "green", missingCodes: s.codes.filter((c) => !after.codes.includes(c) && !after.codes.includes("+" + c)) });
  }

  const done = rows.filter((r) => !r.error);
  const by = (color) => done.filter((r) => r.s.expected === color);
  const pct = (n, d) => (d ? `${Math.round((100 * n) / d)} %` : "—");
  const lines = [];
  lines.push(`# Real-site test set: results`, "", `Run on ${new Date().toISOString().slice(0, 10)}; expectations written before the runs (sites.json, ${new Date().toISOString().slice(0, 10)}).`, "");
  lines.push(`- Sites: ${rows.length} (${done.length} analysed, ${rows.length - done.length} errors)`);
  lines.push(`- Verdict as expected: ${done.filter((r) => r.ok).length} / ${done.length} (${pct(done.filter((r) => r.ok).length, done.length)})`);
  for (const c of ["red", "orange", "green"]) lines.push(`  - expected ${c}: ${by(c).filter((r) => r.ok).length} / ${by(c).length}`);
  lines.push(`- **Green where the expectation was not green: ${done.filter((r) => r.falseGreen).length}** (each one must be reviewed: a real false green, or a wrong expectation?)`);
  lines.push(`- Stable over two network runs (verdict, codes, clause ids): ${done.filter((r) => r.stable).length} / ${done.length}`);
  lines.push(`- Clauses left unclassified: ${done.reduce((n, r) => n + r.unclassified, 0)}`, "");
  lines.push("| Site | Purpose | Expected | Before classification | After | Codes after | Stable | Note |", "| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const r of rows) {
    if (r.error) { lines.push(`| ${r.s.id} | ${r.s.purpose} | ${r.s.expected} | error | | | | ${r.error.replace(/\|/g, "/")} |`); continue; }
    const note = [r.falseGreen && "**unexpected green: review**", !r.ok && "mismatch", r.missingCodes.length && `missing ${r.missingCodes.join(", ")}`].filter(Boolean).join("; ");
    lines.push(`| ${r.s.id} | ${r.s.purpose} | ${r.s.expected} | ${r.before.verdict} | ${r.ok ? "" : "**"}${r.after.verdict}${r.ok ? "" : "**"} | ${r.after.codes.join(" ")} | ${r.stable ? "yes" : "**no**"} | ${note} |`);
  }
  const md = lines.join("\n") + "\n";
  if (outFile) await writeFile(outFile, md);
  console.log(md);
}
