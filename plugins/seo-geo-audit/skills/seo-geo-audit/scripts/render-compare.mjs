#!/usr/bin/env node
// Compare a page's raw HTML (what most AI crawlers see) with the DOM after
// JavaScript runs in a headless Chrome or Edge (close to what Googlebot sees).
//
// Usage:
//   node render-compare.mjs <page URL> [--wait ms] [--browser path] [--json]
//
//   --wait ms       virtual time given to the page's scripts (default 5000)
//   --browser path  Chrome / Chromium / Edge executable (default: CHROME_PATH,
//                   then the usual install locations)
//
// Exit code 3 when no browser is found: fall back to check-live.mjs alone.
// Node 18+, no dependencies.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir, platform } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { analyzeHtml } from "./lib/html.mjs";

const UA = "seo-geo-audit (Claude Code skill; audit run by the site owner)";

const args = process.argv.slice(2);
const json = args.includes("--json");
let wait = 5000;
let browser = process.env.CHROME_PATH || null;
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--json") continue;
  if (args[i] === "--wait") { wait = Number(args[++i]); continue; }
  if (args[i] === "--browser") { browser = args[++i]; continue; }
  positional.push(args[i]);
}
const target = positional[0];
if (positional.length !== 1 || !/^https?:\/\//i.test(target) || !Number.isFinite(wait)) {
  console.error("usage: node render-compare.mjs <page URL> [--wait ms] [--browser path] [--json]");
  process.exit(2);
}

function findBrowser() {
  const candidates = {
    win32: [
      join(process.env["PROGRAMFILES"] ?? "C:\\Program Files", "Google\\Chrome\\Application\\chrome.exe"),
      join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Google\\Chrome\\Application\\chrome.exe"),
      join(process.env["LOCALAPPDATA"] ?? "", "Google\\Chrome\\Application\\chrome.exe"),
      join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Microsoft\\Edge\\Application\\msedge.exe"),
      join(process.env["PROGRAMFILES"] ?? "C:\\Program Files", "Microsoft\\Edge\\Application\\msedge.exe"),
    ],
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ],
  }[platform()] ?? [];
  for (const c of candidates) if (c && existsSync(c)) return c;
  for (const name of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge"]) {
    try {
      const p = execFileSync("which", [name], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      if (p) return p;
    } catch {}
  }
  return null;
}

async function raw(url) {
  const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(15000) });
  return { status: res.status, finalUrl: res.url, html: await res.text() };
}

async function rendered(exe, url) {
  const profile = await mkdtemp(join(tmpdir(), "seo-geo-audit-render-"));
  try {
    const html = await new Promise((resolve, reject) => {
      const child = spawn(exe, [
        "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
        `--user-data-dir=${profile}`, `--virtual-time-budget=${wait}`, "--dump-dom", url,
      ], { stdio: ["ignore", "pipe", "pipe"] });
      let out = "";
      child.stdout.on("data", (d) => (out += d));
      const timer = setTimeout(() => { child.kill(); reject(new Error("browser timed out")); }, wait + 30000);
      child.on("error", reject);
      child.on("close", (code) => {
        clearTimeout(timer);
        out.trim() ? resolve(out) : reject(new Error(`browser exited with code ${code} and no output`));
      });
    });
    return { html };
  } finally {
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

const exe = browser ?? findBrowser();
if (!exe || !existsSync(exe)) {
  console.error("No Chrome, Chromium or Edge found. Set CHROME_PATH or pass --browser. Fall back to check-live.mjs (raw HTML only).");
  process.exit(3);
}

let r, d;
try {
  r = await raw(target);
  d = await rendered(exe, r.finalUrl);
} catch (e) {
  console.error(`error: ${e.message}${e.cause?.code ? ` (${e.cause.code})` : ""}`);
  process.exit(1);
}

const A = analyzeHtml(r.html);
const B = analyzeHtml(d.html);
const types = (x) => x.jsonld.filter((b) => b.valid).flatMap((b) => b.types).sort().join(", ");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const rows = [
  ["title", A.title, B.title],
  ["meta description", A.description.join(" | ") || null, B.description.join(" | ") || null],
  ["meta robots", A.robots.join(" | ") || null, B.robots.join(" | ") || null],
  ["canonical", A.canonical.join(" | ") || null, B.canonical.join(" | ") || null],
  ["lang", A.lang, B.lang],
  ["h1", A.h1.join(" | ") || null, B.h1.join(" | ") || null],
  ["words", A.words, B.words],
  ["links (<a href>)", A.links, B.links],
  ["JSON-LD types", types(A) || null, types(B) || null],
  ["hreflang", A.hreflang.length, B.hreflang.length],
];

const findings = [];
if (B.words >= 20 && A.words < B.words * 0.5) {
  findings.push(`Only ${A.words} of ${B.words} words are in the raw HTML: most content needs JavaScript. Most AI crawlers do not run it; Google does, later and not always.`);
}
if (B.links > A.links) findings.push(`${B.links - A.links} links only exist after JavaScript: crawlers that do not render cannot follow them.`);
for (const [label, a, b] of rows.slice(0, 6)) {
  if (!same(a, b)) {
    if (a === null) findings.push(`${label} only set by JavaScript (rendered: "${b}"). Crawlers that do not render miss it.`);
    else if (b === null) findings.push(`${label} removed by JavaScript (raw: "${a}").`);
    else findings.push(`${label} changed by JavaScript (raw: "${a}", rendered: "${b}"). Search engines may use either.`);
  }
}
if (types(A) !== types(B)) findings.push(`JSON-LD differs (raw: ${types(A) || "none"}; rendered: ${types(B) || "none"}). Structured data added by JavaScript is read by Google, not by most other crawlers.`);
if (/noindex/i.test(B.robots.join(" ")) && !/noindex/i.test(A.robots.join(" "))) findings.push("noindex added by JavaScript: Google may drop the page after rendering.");
if (/noindex/i.test(A.robots.join(" ")) && !/noindex/i.test(B.robots.join(" "))) findings.push("noindex in the raw HTML, removed by JavaScript: Google sees the noindex first and may not render the page at all.");

const report = { url: target, finalUrl: r.finalUrl, status: r.status, browser: exe, waitMs: wait, raw: A, rendered: B, findings };

if (json) {
  for (const side of [report.raw, report.rendered]) for (const b of side.jsonld) delete b.raw;
  console.log(JSON.stringify(report, null, 2));
} else {
  const cut = (v) => (v === null || v === undefined ? "—" : String(v).length > 60 ? String(v).slice(0, 57) + "…" : String(v));
  console.log(`# ${target}  (HTTP ${r.status})`);
  console.log(`browser: ${exe}, wait ${wait} ms\n`);
  console.log(`  ${"".padEnd(18)} ${"raw HTML".padEnd(62)} rendered`);
  for (const [label, a, b] of rows) console.log(`  ${label.padEnd(18)} ${cut(a).padEnd(62)} ${same(a, b) ? "(same)" : cut(b)}`);
  console.log(`\n## Findings (${findings.length})`);
  console.log(findings.length ? findings.map((f) => `  - ${f}`).join("\n") : "  none: the raw HTML already carries what matters");
}
