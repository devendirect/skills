#!/usr/bin/env node
// Ask AI assistants the questions people ask, through their APIs with web
// search on, and record whether they cite the site and which sources they use.
//
// Usage:
//   node ai-mentions.mjs --domain example.com --question "…" [--question "…"]
//                        [--questions file.txt] [--engines claude,openai,perplexity]
//                        [--runs 1] [--yes] [--json]
//
// PAID: every question × engine × run is one API call with web search. Without
// --yes the script only prints the plan and the number of calls, and exits.
// Keys from the environment: ANTHROPIC_API_KEY, OPENAI_API_KEY, PERPLEXITY_API_KEY.
// Engines without a key are skipped. Models: CLAUDE_MODEL (default
// claude-opus-5-5), OPENAI_MODEL (required for OpenAI: models change often),
// PERPLEXITY_PRESET (default "fast").
// Answers vary between runs and users: this is a sample, not a ranking.
// Raw fetch on purpose: the skill's scripts have no dependencies to install.
// Node 18+.

import { readFile } from "node:fs/promises";

const ANTHROPIC_API = process.env.ANTHROPIC_API_BASE ?? "https://api.anthropic.com";
const OPENAI_API = process.env.OPENAI_API_BASE ?? "https://api.openai.com";
const PERPLEXITY_API = process.env.PERPLEXITY_API_BASE ?? "https://api.perplexity.ai";

const args = process.argv.slice(2);
const json = args.includes("--json");
const yes = args.includes("--yes");
const all = (name) => args.flatMap((a, i) => (a === name ? [args[i + 1]] : []));
const one = (name, def = null) => all(name)[0] ?? def;
const fail = (msg, code = 2) => { console.error(msg); process.exit(code); };

const domain = one("--domain")?.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
const questions = [...all("--question")];
const qfile = one("--questions");
if (qfile) questions.push(...(await readFile(qfile, "utf8")).split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")));
const runs = Number(one("--runs", "1"));
if (!domain || !questions.length || !Number.isInteger(runs) || runs < 1) {
  fail('usage: node ai-mentions.mjs --domain example.com --question "…" [--questions file.txt] [--engines claude,openai,perplexity] [--runs 1] [--yes] [--json]');
}

const ENGINES = {
  claude: { key: "ANTHROPIC_API_KEY", label: () => `Claude (${process.env.CLAUDE_MODEL ?? "claude-opus-5-5"}, web search)` },
  openai: { key: "OPENAI_API_KEY", label: () => `OpenAI (${process.env.OPENAI_MODEL}, web search)`, needs: "OPENAI_MODEL" },
  perplexity: { key: "PERPLEXITY_API_KEY", label: () => `Perplexity (Agent API, preset ${process.env.PERPLEXITY_PRESET ?? "fast"})` },
};
const wanted = (one("--engines") ?? Object.keys(ENGINES).join(",")).split(",").map((e) => e.trim()).filter(Boolean);
for (const e of wanted) if (!ENGINES[e]) fail(`unknown engine "${e}" (claude, openai, perplexity)`);
const skipped = [];
const engines = wanted.filter((e) => {
  if (!process.env[ENGINES[e].key]) { skipped.push(`${e}: ${ENGINES[e].key} not set`); return false; }
  if (ENGINES[e].needs && !process.env[ENGINES[e].needs]) { skipped.push(`${e}: ${ENGINES[e].needs} not set (choose a current model with web search)`); return false; }
  return true;
});
if (!engines.length) fail(`No engine available. ${skipped.join("; ")}. See references/ai-mentions.md.`, 4);

const calls = questions.length * engines.length * runs;
const plan = `${questions.length} question(s) × ${engines.length} engine(s) [${engines.join(", ")}] × ${runs} run(s) = ${calls} paid API call(s) with web search`;
if (!yes) {
  console.log(`Plan: ${plan}.`);
  if (skipped.length) console.log(`Skipped: ${skipped.join("; ")}.`);
  console.log("Nothing was sent. Confirm the cost with the user, then re-run with --yes.");
  process.exit(0);
}

// --- engines ---------------------------------------------------------------

async function post(url, headers, body) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${data.error?.message ?? data.message ?? JSON.stringify(data).slice(0, 200)}`);
  return data;
}

async function askClaude(question) {
  const headers = {
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    // Server-side fallback: a declined request is re-run on another model.
    "anthropic-beta": "server-side-fallback-2026-07-01",
  };
  const messages = [{ role: "user", content: question }];
  let content = [];
  const usage = { input_tokens: 0, output_tokens: 0, web_searches: 0 };
  for (let turn = 0; turn < 4; turn++) {
    const r = await post(`${ANTHROPIC_API}/v1/messages`, headers, {
      model: process.env.CLAUDE_MODEL ?? "claude-opus-5-5",
      // Thinking is always on and counts toward max_tokens: leave room for it.
      max_tokens: 16000,
      output_config: { effort: "low" },
      fallbacks: "default",
      tools: [{ type: "web_search_20260318", name: "web_search", max_uses: 3 }],
      messages,
    });
    usage.input_tokens += r.usage?.input_tokens ?? 0;
    usage.output_tokens += r.usage?.output_tokens ?? 0;
    usage.web_searches += r.usage?.server_tool_use?.web_search_requests ?? 0;
    if (r.stop_reason === "refusal") return { refused: r.stop_details?.category ?? true, cited: [], sources: [], text: "", usage };
    // A cut-off answer may have lost its citations: report it, never count it as "not cited".
    if (r.stop_reason === "max_tokens") throw new Error("answer cut off at max_tokens, not counted");
    content = content.concat(r.content ?? []);
    if (r.stop_reason !== "pause_turn") break;
    // Paused long search turn: send the assistant content back unchanged.
    messages.push({ role: "assistant", content: r.content });
  }
  const cited = content.filter((b) => b.type === "text").flatMap((b) => (b.citations ?? []).filter((c) => c.url).map((c) => c.url));
  const sources = content.filter((b) => b.type === "web_search_tool_result" && Array.isArray(b.content)).flatMap((b) => b.content.map((x) => x.url).filter(Boolean));
  const text = content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return { cited, sources, text, usage };
}

async function askOpenAI(question) {
  const r = await post(`${OPENAI_API}/v1/responses`, { authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, {
    model: process.env.OPENAI_MODEL,
    tools: [{ type: "web_search" }],
    include: ["web_search_call.action.sources"],
    input: question,
  });
  const out = r.output ?? [];
  const parts = out.filter((o) => o.type === "message").flatMap((o) => o.content ?? []);
  const cited = parts.flatMap((p) => (p.annotations ?? []).filter((a) => a.type === "url_citation" && a.url).map((a) => a.url));
  const sources = out.filter((o) => o.type === "web_search_call").flatMap((o) => (o.action?.sources ?? []).map((s) => s.url).filter(Boolean));
  const usage = { input_tokens: r.usage?.input_tokens ?? 0, output_tokens: r.usage?.output_tokens ?? 0, web_searches: out.filter((o) => o.type === "web_search_call").length };
  return { cited, sources, text: parts.map((p) => p.text ?? "").join(""), usage };
}

async function askPerplexity(question) {
  const r = await post(`${PERPLEXITY_API}/v1/agent`, { authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}` }, {
    preset: process.env.PERPLEXITY_PRESET ?? "fast",
    input: question,
    tools: [{ type: "web_search" }],
  });
  const out = r.output ?? [];
  const parts = out.filter((o) => o.type === "message").flatMap((o) => o.content ?? []);
  const cited = parts.flatMap((p) => (p.annotations ?? []).filter((a) => a.url).map((a) => a.url));
  const sources = out.filter((o) => o.type === "search_results").flatMap((o) => (o.results ?? []).map((x) => x.url).filter(Boolean));
  const usage = { input_tokens: r.usage?.input_tokens ?? 0, output_tokens: r.usage?.output_tokens ?? 0, web_searches: out.filter((o) => o.type === "search_results").length };
  return { cited, sources, text: parts.map((p) => p.text ?? "").join(""), usage };
}

const ASK = { claude: askClaude, openai: askOpenAI, perplexity: askPerplexity };

// --- run -------------------------------------------------------------------

const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; } };
const isSite = (u) => { const h = hostOf(u); return h === domain || h?.endsWith(`.${domain}`); };

const results = [];
for (const question of questions) {
  for (const engine of engines) {
    for (let run = 1; run <= runs; run++) {
      try {
        const a = await ASK[engine](question);
        const citedHosts = [...new Set(a.cited.map(hostOf).filter(Boolean))];
        results.push({
          question, engine, run,
          refused: a.refused ?? false,
          cited: a.cited.some(isSite),
          citedPosition: citedHosts.findIndex((h) => h === domain || h.endsWith(`.${domain}`)) + 1 || null,
          inSources: a.sources.some(isSite),
          mentioned: new RegExp(domain.replace(/\./g, "\\."), "i").test(a.text),
          citedHosts,
          sourceCount: a.sources.length,
          usage: a.usage ?? null,
        });
      } catch (e) {
        results.push({ question, engine, run, error: e.message });
      }
    }
  }
}

const summary = questions.map((q) => ({
  question: q,
  engines: engines.map((e) => {
    const rs = results.filter((r) => r.question === q && r.engine === e);
    const ok = rs.filter((r) => !r.error && !r.refused);
    const competitors = new Map();
    for (const r of ok) for (const h of r.citedHosts) if (h !== domain && !h.endsWith(`.${domain}`)) competitors.set(h, (competitors.get(h) ?? 0) + 1);
    return {
      engine: e, runs: rs.length, answered: ok.length,
      cited: ok.filter((r) => r.cited).length,
      inSourcesOnly: ok.filter((r) => !r.cited && r.inSources).length,
      errors: rs.filter((r) => r.error).map((r) => r.error),
      refused: rs.filter((r) => r.refused).length,
      topCitedDomains: [...competitors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([host, n]) => ({ host, n })),
    };
  }),
}));

// What the run actually consumed, per engine (tokens and web searches as reported by each API).
const usage = Object.fromEntries(engines.map((e) => [e, results.filter((r) => r.engine === e && r.usage).reduce(
  (t, r) => ({ input_tokens: t.input_tokens + r.usage.input_tokens, output_tokens: t.output_tokens + r.usage.output_tokens, web_searches: t.web_searches + r.usage.web_searches }),
  { input_tokens: 0, output_tokens: 0, web_searches: 0 },
)]));

const report = { checkedAt: new Date().toISOString(), domain, plan, skipped, usage, summary, results };
if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`# AI mentions of ${domain}  (${report.checkedAt.slice(0, 10)})`);
  console.log(`${plan}${skipped.length ? `; skipped ${skipped.join(", ")}` : ""}\n`);
  for (const s of summary) {
    console.log(`## "${s.question}"`);
    for (const e of s.engines) {
      const status = e.answered === 0 ? (e.refused ? "refused" : `error: ${e.errors[0]}`) : `cited in ${e.cited}/${e.answered}${e.inSourcesOnly ? `, read but not cited in ${e.inSourcesOnly}` : ""}`;
      console.log(`  ${ENGINES[e.engine].label().padEnd(48)} ${status}`);
      if (e.topCitedDomains.length) console.log(`  ${"".padEnd(48)} cites instead: ${e.topCitedDomains.map((d) => `${d.host} (${d.n})`).join(", ")}`);
    }
    console.log("");
  }
  console.log(`Consumed: ${engines.map((e) => `${e} ${usage[e].input_tokens} in / ${usage[e].output_tokens} out tokens, ${usage[e].web_searches} searches`).join("; ")}.`);
  console.log("Answers vary between runs, accounts and locations: a sample, not a ranking.");
}
