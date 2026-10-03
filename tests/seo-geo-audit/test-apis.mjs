#!/usr/bin/env node
// Tests the API modes of search-data.mjs and ai-mentions.mjs against a local
// mock of the real APIs, so they run without accounts or keys.
//
// Usage: node test-apis.mjs
//
// The Google token endpoint mock verifies the service-account JWT signature
// with the matching public key: the auth code is tested for real.
// Node 18+, no dependencies.

import http from "node:http";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const here = fileURLToPath(new URL(".", import.meta.url));
const scripts = join(here, "..", "..", "plugins", "seo-geo-audit", "skills", "seo-geo-audit", "scripts");

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const seen = { tokenRequests: 0, jwtValid: false, scope: null, bodies: [], aiCalls: 0, claude: [], openai: [] };

const read = (req) => new Promise((r) => { let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => r(b)); });
const send = (res, code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
const fromB64url = (s) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

let base;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const body = await read(req);

  // --- Google OAuth token endpoint
  if (url.pathname === "/token" && req.method === "POST") {
    seen.tokenRequests++;
    const assertion = new URLSearchParams(body).get("assertion") ?? "";
    const [h, p, sig] = assertion.split(".");
    const ok = createVerify("RSA-SHA256").update(`${h}.${p}`).verify(publicKey, fromB64url(sig ?? ""));
    const claims = JSON.parse(fromB64url(p ?? "").toString() || "{}");
    seen.jwtValid = ok && claims.aud === `${base}/token` && claims.iss === "audit@test.iam.gserviceaccount.com" && claims.exp > claims.iat;
    seen.scope = claims.scope;
    return ok ? send(res, 200, { access_token: "mock-token", expires_in: 3600 }) : send(res, 400, { error: "invalid_grant", error_description: "bad signature" });
  }
  const authed = req.headers.authorization === "Bearer mock-token";

  // --- Search Console: search analytics
  const m = url.pathname.match(/^\/webmasters\/v3\/sites\/(.+)\/searchAnalytics\/query$/);
  if (m) {
    if (!authed) return send(res, 401, { error: { message: "Request is missing required authentication credential." } });
    if (decodeURIComponent(m[1]) === "sc-domain:forbidden.example") return send(res, 403, { error: { message: "User does not have sufficient permission for site." } });
    seen.bodies.push(JSON.parse(body));
    return send(res, 200, { rows: [
      { keys: ["cours céramique nantes"], clicks: 31, impressions: 402, ctr: 0.0771, position: 2.9 },
      { keys: ["stage poterie nantes"], clicks: 0, impressions: 350, ctr: 0, position: 9.4 },
      { keys: ["poterie enfants"], clicks: 5, impressions: 120, ctr: 0.0417, position: 6.1 },
    ] });
  }

  // --- Search Console: URL inspection
  if (url.pathname === "/v1/urlInspection/index:inspect") {
    if (!authed) return send(res, 401, { error: { message: "unauthenticated" } });
    const b = JSON.parse(body);
    return send(res, 200, { inspectionResult: { indexStatusResult: {
      verdict: "NEUTRAL", coverageState: "Excluded by 'noindex' tag", indexingState: "BLOCKED_BY_META_TAG",
      robotsTxtState: "ALLOWED", pageFetchState: "SUCCESSFUL", lastCrawlTime: "2026-09-30T08:00:00Z",
      googleCanonical: b.inspectionUrl, userCanonical: b.inspectionUrl,
    } } });
  }

  // --- Bing Webmaster API
  if (url.pathname === "/webmaster/api.svc/json/GetQueryStats") {
    if (url.searchParams.get("apikey") !== "test-bing-key") return send(res, 401, { Message: "Invalid API key" });
    return send(res, 200, { d: [
      { __type: "QueryStats", Query: "cours ceramique nantes", Clicks: 3, Impressions: 40, AvgImpressionPosition: 4, AvgClickPosition: 3, Date: "/Date(1758700000000-0700)/" },
      { __type: "QueryStats", Query: "cours ceramique nantes", Clicks: 1, Impressions: 60, AvgImpressionPosition: 6, AvgClickPosition: 5, Date: "/Date(1758786400000-0700)/" },
      { __type: "QueryStats", Query: "poterie nantes", Clicks: 0, Impressions: 30, AvgImpressionPosition: 11, AvgClickPosition: 0, Date: "/Date(1758700000000-0700)/" },
    ] });
  }

  // --- Anthropic Messages API (web search)
  if (url.pathname === "/v1/messages") {
    seen.aiCalls++;
    const b = JSON.parse(body);
    seen.claude.push({ headers: { key: req.headers["x-api-key"], version: req.headers["anthropic-version"], beta: req.headers["anthropic-beta"] }, body: b });
    if (req.headers["x-api-key"] !== "test-anthropic") return send(res, 401, { error: { message: "invalid x-api-key" } });
    const q = b.messages[0].content;
    if (/refuse/.test(q)) return send(res, 200, { stop_reason: "refusal", stop_details: { type: "refusal", category: "cyber" }, content: [] });
    if (b.messages.length === 1) return send(res, 200, { stop_reason: "pause_turn", content: [
      { type: "server_tool_use", id: "srvtoolu_1", name: "web_search", input: { query: q } },
      { type: "web_search_tool_result", tool_use_id: "srvtoolu_1", content: [
        { type: "web_search_result", url: "https://www.atelier.example/cours/", title: "Cours", encrypted_content: "x" },
        { type: "web_search_result", url: "https://rival.example/stages", title: "Stages", encrypted_content: "y" },
      ] },
    ] });
    return send(res, 200, { stop_reason: "end_turn", content: [
      { type: "text", text: "Two workshops offer this: " },
      { type: "text", text: "Rival runs weekend courses.", citations: [{ type: "web_search_result_location", url: "https://rival.example/stages", title: "Stages", cited_text: "…" }] },
    ] });
  }

  // --- OpenAI Responses API (web search)
  if (url.pathname === "/v1/responses") {
    seen.aiCalls++;
    const b = JSON.parse(body);
    seen.openai.push(b);
    return send(res, 200, { output: [
      { type: "web_search_call", action: { type: "search", sources: [{ type: "url", url: "https://atelier.example/" }, { type: "url", url: "https://rival.example/" }] } },
      { type: "message", content: [{ type: "output_text", text: "Atelier Brun (atelier.example) teaches throwing.", annotations: [{ type: "url_citation", url: "https://atelier.example/cours/", title: "Cours" }] }] },
    ] });
  }

  // --- Perplexity Agent API
  if (url.pathname === "/v1/agent") {
    seen.aiCalls++;
    if (req.headers.authorization !== "Bearer test-pplx") return send(res, 401, { error: { message: "bad key" } });
    return send(res, 500, { error: { message: "upstream unavailable" } });
  }

  send(res, 404, { error: { message: `mock: no route for ${req.method} ${url.pathname}` } });
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
base = `http://127.0.0.1:${server.address().port}`;
const dir = await mkdtemp(join(tmpdir(), "seo-geo-audit-apis-"));
const keyFile = join(dir, "sa.json");
await writeFile(keyFile, JSON.stringify({
  type: "service_account", client_email: "audit@test.iam.gserviceaccount.com",
  private_key: privateKey.export({ type: "pkcs8", format: "pem" }), token_uri: `${base}/token`,
}));

const env = { ...process.env, GSC_API_BASE: base, GSC_INSPECT_API_BASE: base, BING_API_BASE: base, ANTHROPIC_API_BASE: base, OPENAI_API_BASE: base, PERPLEXITY_API_BASE: base };
for (const k of ["GSC_ACCESS_TOKEN", "GSC_KEY_FILE", "BING_WEBMASTER_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "PERPLEXITY_API_KEY", "OPENAI_MODEL", "CLAUDE_MODEL", "PERPLEXITY_PRESET"]) delete env[k];

let passed = 0, failed = 0;
async function test(label, args, extraEnv, check) {
  let out, code = 0, err = "";
  try {
    ({ stdout: out } = await run(process.execPath, [join(scripts, args[0]), ...args.slice(1)], { env: { ...env, ...extraEnv } }));
  } catch (e) {
    code = e.code; out = e.stdout; err = e.stderr;
  }
  const problems = check({ out, code, err });
  if (problems.length) { failed++; console.log(`  FAIL ${label}\n${problems.map((p) => `       - ${p}`).join("\n")}${err ? `\n       stderr: ${err.trim()}` : ""}`); }
  else { passed++; console.log(`  ok   ${label}`); }
}
const has = (cond, msg) => (cond ? [] : [msg]);

console.log("# search-data.mjs");
await test("gsc: service-account auth, signed JWT verified", ["search-data.mjs", "gsc", "--site", "sc-domain:atelier.example", "--json"], { GSC_KEY_FILE: keyFile }, ({ out, code }) => {
  const r = code === 0 ? JSON.parse(out) : {};
  return [
    ...has(code === 0, `exit ${code}`),
    ...has(seen.jwtValid, "JWT signature, audience or issuer not valid"),
    ...has(seen.scope === "https://www.googleapis.com/auth/webmasters.readonly", `scope ${seen.scope}`),
    ...has(r.count === 3 && r.totals?.clicks === 36, `count/clicks ${r.count}/${r.totals?.clicks}`),
    ...has(r.noClicks?.[0]?.key === "stage poterie nantes", "noClicks should list 'stage poterie nantes'"),
    ...has(seen.bodies[0]?.dimensions?.[0] === "query" && /^\d{4}-\d{2}-\d{2}$/.test(seen.bodies[0]?.startDate ?? ""), "request body"),
  ];
});
await test("gsc: access token instead of a key file", ["search-data.mjs", "gsc", "--site", "sc-domain:atelier.example", "--dimension", "page", "--json"], { GSC_ACCESS_TOKEN: "mock-token" }, ({ code }) => [
  ...has(code === 0, `exit ${code}`), ...has(seen.bodies[1]?.dimensions?.[0] === "page", "dimension page not sent"),
]);
await test("gsc: 403 explained", ["search-data.mjs", "gsc", "--site", "sc-domain:forbidden.example"], { GSC_ACCESS_TOKEN: "mock-token" }, ({ code, err }) => [
  ...has(code === 1, `exit ${code}`), ...has(/403/.test(err) && /property/.test(err), "403 message should mention the property"),
]);
await test("gsc: no credentials", ["search-data.mjs", "gsc", "--site", "sc-domain:atelier.example"], {}, ({ code, err }) => [
  ...has(code === 4, `exit ${code}`), ...has(/GSC_KEY_FILE/.test(err), "should say which variable to set"),
]);
await test("inspect: noindex page", ["search-data.mjs", "inspect", "--site", "sc-domain:atelier.example", "--url", "https://atelier.example/cours/", "--json"], { GSC_ACCESS_TOKEN: "mock-token" }, ({ out, code }) => {
  const r = code === 0 ? JSON.parse(out) : {};
  return [...has(r.indexingState === "BLOCKED_BY_META_TAG", `indexingState ${r.indexingState}`)];
});
await test("bing: rows summed per query, positions weighted", ["search-data.mjs", "bing", "--site", "https://atelier.example/", "--json"], { BING_WEBMASTER_API_KEY: "test-bing-key" }, ({ out, code }) => {
  const r = code === 0 ? JSON.parse(out) : {};
  const top = r.topByClicks?.[0] ?? {};
  return [
    ...has(r.count === 2, `count ${r.count}`),
    ...has(top.clicks === 4 && top.impressions === 100, `sum ${top.clicks}/${top.impressions}`),
    ...has(Math.abs(top.position - 5.2) < 1e-9, `weighted position ${top.position}`),
  ];
});
await test("bing: wrong key", ["search-data.mjs", "bing", "--site", "https://atelier.example/"], { BING_WEBMASTER_API_KEY: "nope" }, ({ code, err }) => [
  ...has(code === 1 && /401/.test(err), `exit ${code}`), ...has(!/nope/.test(err), "the key must not be printed"),
]);

console.log("\n# ai-mentions.mjs");
const AI_KEYS = { ANTHROPIC_API_KEY: "test-anthropic", OPENAI_API_KEY: "test-openai", OPENAI_MODEL: "test-model", PERPLEXITY_API_KEY: "test-pplx" };
await test("without --yes: plan only, no paid call", ["ai-mentions.mjs", "--domain", "atelier.example", "--question", "cours poterie nantes", "--runs", "2"], AI_KEYS, ({ out, code }) => [
  ...has(code === 0, `exit ${code}`), ...has(/= 6 paid API call/.test(out), "plan should announce 6 calls"), ...has(seen.aiCalls === 0, `${seen.aiCalls} calls were sent`),
]);
await test("OpenAI skipped without OPENAI_MODEL", ["ai-mentions.mjs", "--domain", "atelier.example", "--question", "q"], { ...AI_KEYS, OPENAI_MODEL: "" }, ({ out }) => [
  ...has(/openai: OPENAI_MODEL not set/.test(out), "should explain the skip"), ...has(/= 2 paid API call/.test(out), "2 calls without OpenAI"),
]);
await test("with --yes: citations, sources, pause_turn, errors", ["ai-mentions.mjs", "--domain", "www.atelier.example", "--question", "cours poterie nantes", "--json", "--yes"], AI_KEYS, ({ out, code }) => {
  const r = code === 0 ? JSON.parse(out) : { summary: [] };
  const by = Object.fromEntries((r.summary[0]?.engines ?? []).map((e) => [e.engine, e]));
  const c = seen.claude.at(-1) ?? {};
  return [
    ...has(code === 0, `exit ${code}`),
    ...has(by.claude?.cited === 0 && by.claude?.inSourcesOnly === 1, "claude: read but not cited"),
    ...has(by.claude?.topCitedDomains?.[0]?.host === "rival.example", "claude: cites rival instead"),
    ...has(seen.claude.length === 2 && c.body?.messages?.length === 2 && c.body.messages[1].role === "assistant", "pause_turn: assistant content sent back"),
    ...has(c.body?.model === "claude-opus-5-5" && c.body?.tools?.[0]?.type === "web_search_20260318" && c.body?.fallbacks === "default", "claude request body"),
    ...has(c.headers?.version === "2023-06-01" && c.headers?.beta === "server-side-fallback-2026-07-01", "claude headers"),
    ...has(by.openai?.cited === 1, "openai: cited"),
    ...has(seen.openai[0]?.include?.[0] === "web_search_call.action.sources" && seen.openai[0]?.model === "test-model", "openai request"),
    ...has(by.perplexity?.answered === 0 && /500/.test(by.perplexity?.errors?.[0] ?? ""), "perplexity: error reported, run continues"),
  ];
});
await test("refusal recorded", ["ai-mentions.mjs", "--domain", "atelier.example", "--question", "please refuse", "--engines", "claude", "--json", "--yes"], AI_KEYS, ({ out, code }) => {
  const r = code === 0 ? JSON.parse(out) : { summary: [] };
  return [...has(r.summary[0]?.engines?.[0]?.refused === 1, "refused count")];
});
await test("no key at all", ["ai-mentions.mjs", "--domain", "atelier.example", "--question", "q", "--yes"], {}, ({ code, err }) => [
  ...has(code === 4 && /ANTHROPIC_API_KEY/.test(err), `exit ${code}`),
]);

server.close();
await rm(dir, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
