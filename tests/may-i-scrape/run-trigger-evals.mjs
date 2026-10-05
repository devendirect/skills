#!/usr/bin/env node
// Does Claude consult may-i-scrape for a given request? Measures the skill's
// description against trigger-evals.json, the way skill-creator's run_eval.py
// does (whose select() on pipes does not work on Windows).
//
// Usage:
//   node run-trigger-evals.mjs [--description-file F] [--runs N] [--split train|test|all]
//                              [--concurrency N] [--out FILE]
//
// Each run: a fresh folder with the skill installed (SKILL.md frontmatter
// description replaced by --description-file if given), then
// `claude -p "<query>" --max-turns 1`: the first turn is enough to see whether
// the model calls the Skill tool (or reads the SKILL.md). Only the Skill and
// Read tools are allowed, so nothing else runs. Costs real usage (a few cents
// per call): say so before running. Node 18+, no dependencies.

import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));

// Paid: never run on import (an import from another script once started a full paid pass).
if (!process.argv[1] || fileURLToPath(import.meta.url) !== resolve(process.argv[1])) {
  throw new Error("run-trigger-evals.mjs is a command, not a module: run it with node");
}
const skill = join(here, "..", "..", "plugins", "may-i-scrape", "skills", "may-i-scrape");
const NAME = "may-i-scrape";

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const runs = Number(opt("--runs", "3"));
const split = opt("--split", "all");
const concurrency = Number(opt("--concurrency", "4"));
const out = opt("--out", null);
const descFile = opt("--description-file", null);

const { queries } = JSON.parse(await readFile(join(here, "trigger-evals.json"), "utf8"));

// Deterministic 60 / 40 split inside each class (items 2 and 4 of every 5 go to test).
function splitSet(items) {
  const train = [], test = [];
  for (const cls of [true, false]) {
    items.filter((q) => q.should_trigger === cls).forEach((q, i) => ((i % 5 === 1 || i % 5 === 3) ? test : train).push(q));
  }
  return { train, test };
}
const sets = splitSet(queries);
const selected = split === "train" ? sets.train : split === "test" ? sets.test : queries;

// The skill as Claude would see it, with the candidate description.
const skillMd = await readFile(join(skill, "SKILL.md"), "utf8");
const description = descFile ? (await readFile(descFile, "utf8")).trim() : skillMd.match(/^description: "([\s\S]*?)"\s*$/m)[1];
const candidate = skillMd.replace(/^description: "[\s\S]*?"\s*$/m, `description: ${JSON.stringify(description)}`);

function runOnce(query, idx) {
  return new Promise(async (resolve) => {
    const dir = join(tmpdir(), "may-i-scrape-trigger", `${process.pid}-${idx}`);
    await rm(dir, { recursive: true, force: true });
    await mkdir(join(dir, ".claude", "skills"), { recursive: true });
    await cp(skill, join(dir, ".claude", "skills", NAME), { recursive: true });
    await writeFile(join(dir, ".claude", "skills", NAME, "SKILL.md"), candidate);
    const child = spawn(process.env.CLAUDE_BIN ?? "claude", ["-p", query, "--max-turns", "1", "--output-format", "stream-json", "--verbose", "--allowedTools", "Skill Read"], { cwd: dir });
    let text = "";
    child.stdout.on("data", (d) => (text += d));
    child.stderr.on("data", () => {});
    const timer = setTimeout(() => child.kill(), 120000);
    child.on("close", async () => {
      clearTimeout(timer);
      const events = text.split(/\r?\n/).filter((l) => l.startsWith("{")).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      const uses = events.filter((e) => e.type === "assistant").flatMap((e) => e.message?.content ?? []).filter((c) => c.type === "tool_use");
      const first = uses[0];
      const triggered = uses.some((u) => (u.name === "Skill" && String(u.input?.skill ?? "").includes(NAME)) || (u.name === "Read" && String(u.input?.file_path ?? "").includes(`${NAME}`)));
      const result = events.find((e) => e.type === "result") ?? {};
      const limit = /hit your (session|usage) limit/i.test(result.result ?? "");
      await rm(dir, { recursive: true, force: true }).catch(() => {});
      resolve({ triggered, first: first ? `${first.name}${first.input?.skill ? ":" + first.input.skill : ""}` : "(no tool)", cost: result.total_cost_usd ?? 0, limit });
    });
  });
}

// Run all (query, run) pairs with a small pool.
const jobs = selected.flatMap((q) => Array.from({ length: runs }, () => q));
const results = new Map(selected.map((q) => [q.query, []]));
let next = 0, done = 0, cost = 0, limited = false;
async function worker(w) {
  while (next < jobs.length && !limited) {
    const i = next++;
    const r = await runOnce(jobs[i].query, `${w}-${i}`);
    if (r.limit) { limited = true; break; }
    results.get(jobs[i].query).push(r);
    cost += r.cost;
    done++;
    process.stderr.write(`\r${done}/${jobs.length} calls, $${cost.toFixed(2)}   `);
  }
}
await Promise.all(Array.from({ length: concurrency }, (_, w) => worker(w)));
process.stderr.write("\n");
if (limited) console.log("Usage limit reached: results are partial.");

const rows = selected.map((q) => {
  const rs = results.get(q.query);
  const rate = rs.length ? rs.filter((r) => r.triggered).length / rs.length : NaN;
  return { query: q.query, should_trigger: q.should_trigger, rate, ok: rs.length > 0 && (rate >= 0.5) === q.should_trigger, firsts: [...new Set(rs.map((r) => r.first))] };
});
const pos = rows.filter((r) => r.should_trigger), neg = rows.filter((r) => !r.should_trigger);
const summary = {
  split, runs, description,
  passed: rows.filter((r) => r.ok).length, total: rows.length,
  should_trigger_ok: pos.filter((r) => r.ok).length, should_trigger_total: pos.length,
  should_not_ok: neg.filter((r) => r.ok).length, should_not_total: neg.length,
  cost: Number(cost.toFixed(2)), calls: done, rows,
};
for (const r of rows) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.should_trigger ? "trigger " : "no-trig "} ${(r.rate * 100).toFixed(0).padStart(3)}%  ${r.query.slice(0, 90)}  [${r.firsts.join(", ")}]`);
console.log(`\n${summary.passed}/${summary.total} as expected (should trigger ${summary.should_trigger_ok}/${summary.should_trigger_total}, should not ${summary.should_not_ok}/${summary.should_not_total}); ${done} calls, $${summary.cost}`);
if (out) await writeFile(out, JSON.stringify(summary, null, 2));
