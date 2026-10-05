#!/usr/bin/env node
// Level 2: runs the full skill, headless (`claude -p`), on fixture sites,
// one scenario after the other, and checks the transcript against
// skill-evals.json. Everything the checks cannot see is listed "by hand".
//
// Usage: node run-skill-evals.mjs [--out DIR] [eval id ...]
//
// Each scenario gets a fresh folder with this repo's skill installed as
// "may-i-scrape-under-test" (so it cannot be confused with an installed
// copy), and its fixture served on 127.0.0.1. Costs real usage (about $1 and
// a few minutes per scenario): say so before running it. Stops at the first
// usage-limit message. Node 18+, no dependencies.

import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { start } from "./serve.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));

// Paid: never run on import.
if (!process.argv[1] || fileURLToPath(import.meta.url) !== resolve(process.argv[1])) {
  throw new Error("run-skill-evals.mjs is a command, not a module: run it with node");
}
const skill = join(here, "..", "..", "plugins", "may-i-scrape", "skills", "may-i-scrape");
const { evals } = JSON.parse(await readFile(join(here, "skill-evals.json"), "utf8"));

const args = process.argv.slice(2);
const o = args.indexOf("--out");
const out = o >= 0 ? args.splice(o, 2)[1] : join(tmpdir(), "may-i-scrape-evals", new Date().toISOString().replace(/[:.]/g, "-"));
const only = args;
await mkdir(out, { recursive: true });

// Shell tools must include PowerShell on Windows, or every script call is silently denied.
const TOOLS = "Bash PowerShell Read Write Glob Grep Skill";
const SUFFIX = "\n\n(Headless test run: if you need to ask a question, state your assumption instead and go on.)";

function runClaude(cwd, prompt, logFile) {
  return new Promise((resolve) => {
    // No shell: the prompt (accents, quotes) is passed as one argument, untouched.
    // CLAUDE_BIN can point at the executable if `claude` is not on the PATH.
    const child = spawn(process.env.CLAUDE_BIN ?? "claude", ["-p", prompt, "--output-format", "stream-json", "--verbose", "--permission-mode", "acceptEdits", "--allowedTools", TOOLS], { cwd });
    const chunks = [];
    child.stdout.on("data", (d) => chunks.push(d));
    child.stderr.on("data", (d) => chunks.push(d));
    child.on("close", async (code) => {
      const text = Buffer.concat(chunks).toString("utf8");
      await writeFile(logFile, text);
      resolve({ code, text });
    });
  });
}

// stream-json: one JSON object per line.
function parse(text) {
  const events = text.split(/\r?\n/).filter((l) => l.startsWith("{")).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const toolUses = events.filter((e) => e.type === "assistant").flatMap((e) => e.message?.content ?? []).filter((c) => c.type === "tool_use");
  const commands = toolUses.filter((t) => t.name === "Bash" || t.name === "PowerShell").map((t) => t.input?.command ?? "");
  const result = events.find((e) => e.type === "result") ?? {};
  return { toolUses, commands, answer: result.result ?? "", cost: result.total_cost_usd ?? 0, turns: result.num_turns ?? 0, denials: result.permission_denials ?? [] };
}

const summary = [];
for (const ev of evals.filter((e) => !only.length || only.includes(e.id))) {
  const dir = join(out, ev.id);
  await mkdir(join(dir, ".claude", "skills"), { recursive: true });
  await cp(skill, join(dir, ".claude", "skills", "may-i-scrape-under-test"), { recursive: true });
  const skillMd = join(dir, ".claude", "skills", "may-i-scrape-under-test", "SKILL.md");
  await writeFile(skillMd, (await readFile(skillMd, "utf8")).replace(/^name: may-i-scrape$/m, "name: may-i-scrape-under-test"));
  // "staleFacts": an installed copy never updated: every "last checked" date set to staleFacts.
  if (ev.staleFacts) {
    const refs = join(dir, ".claude", "skills", "may-i-scrape-under-test", "references");
    for (const f of [skillMd, ...["legal-eu.md", "legal-fr.md", "legal-de.md", "legal-uk.md", "legal-us.md"].map((n) => join(refs, n))]) {
      await writeFile(f, (await readFile(f, "utf8")).replace(/([Ll]ast checked(?: on)?:? \*\*)\d{4}-\d{2}-\d{2}(\*\*)/, `$1${ev.staleFacts}$2`));
    }
  }

  // "fixture": null = no server (offline scenario); the prompt gives its own URL.
  const { server, url } = ev.fixture ? await start(ev.fixture) : { server: null, url: "" };
  const prompt = ev.prompt.replaceAll("{URL}", url + (ev.path ?? "")) + SUFFIX;
  process.stdout.write(`== ${ev.id} (${ev.fixture}) … `);
  const startedAt = Date.now();
  const { code, text } = await runClaude(dir, prompt, join(out, `log-${ev.id}.jsonl`));
  server?.close();
  const r = parse(text);

  // A usage limit is not a failure of the skill: record it as not run, and stop.
  if (/hit your (session|usage) limit|usage limit reached|session limit/i.test(r.answer) || (!r.answer && /usage limit|session limit|rate_limit/i.test(text))) {
    console.log(`NOT RUN (usage limit): ${r.answer.slice(0, 120)}`);
    summary.push({ id: ev.id, ok: false, notRun: true, errors: ["usage limit"], cost: r.cost, turns: r.turns, seconds: 0, commands: r.commands, answer: r.answer });
    await writeFile(join(out, "summary.json"), JSON.stringify(summary, null, 2));
    console.log("Usage limit reached: stopping. Re-run the remaining scenarios after the reset.");
    break;
  }

  const errors = [];
  const e = ev.expect;
  for (const re of e.answer ?? []) if (!new RegExp(re, "i").test(r.answer)) errors.push(`answer lacks /${re}/`);
  for (const re of e.answerNot ?? []) { const m = r.answer.match(new RegExp(re, "i")); if (m) errors.push(`answer contains "${m[0]}" (check by hand: it may be a refusal)`); }
  if (e.answerEnd && !new RegExp(e.answerEnd, "i").test(r.answer.slice(-700))) errors.push(`the end of the answer lacks /${e.answerEnd}/ (disclaimer must be last)`);
  if (e.answerStart && !new RegExp(e.answerStart, "i").test(r.answer.slice(0, 600))) errors.push(`the start of the answer lacks /${e.answerStart}/`);
  const allCommands = r.commands.join("\n");
  for (const re of e.commands ?? []) if (!new RegExp(re).test(allCommands)) errors.push(`no command matching /${re}/`);
  for (const re of e.commandsNot ?? []) if (new RegExp(re).test(allCommands)) errors.push(`a command matches /${re}/`);
  for (const t of e.noTools ?? []) if (r.toolUses.some((u) => u.name === t)) errors.push(`used ${t}`);
  if (r.denials.length) errors.push(`${r.denials.length} permission denial(s): ${r.denials.map((d) => d.tool_name).join(", ")}`);
  if (!r.answer) errors.push(`no final answer (exit ${code})`);

  const secs = Math.round((Date.now() - startedAt) / 1000);
  console.log(`${errors.length ? "FAIL" : "ok"}  ${secs} s, ${r.turns} turns, $${r.cost.toFixed(2)}`);
  for (const x of errors) console.log(`   - ${x}`);
  console.log(`   by hand: ${ev.byHand}`);
  summary.push({ id: ev.id, ok: !errors.length, errors, cost: r.cost, turns: r.turns, seconds: secs, commands: r.commands, answer: r.answer });
  await writeFile(join(out, "summary.json"), JSON.stringify(summary, null, 2));

}

const cost = summary.reduce((n, s) => n + s.cost, 0);
console.log(`\n${summary.filter((s) => s.ok).length} / ${summary.length} passed the automatic checks, total $${cost.toFixed(2)}. Transcripts and answers: ${out}`);
process.exit(summary.every((s) => s.ok) ? 0 : 1);
