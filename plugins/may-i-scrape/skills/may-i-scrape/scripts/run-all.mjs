#!/usr/bin/env node
// May I scrape this page? Reads the machine-readable signals of a site and
// the clauses of its terms of use, then applies the decision table for each
// purpose.
//
// Usage:
//   node run-all.mjs <URL> [--purpose P] [--agent token] [--volume N[/period]]
//                    [--personal-data likely] [--classify JSON|file] [--datagouv]
//                    [--offline] [--robots-file f] [--page-file f]
//                    [--headers-file f] [--terms-file f] [--json]
//
//   --purpose        lookup | monitor | bulk | ai-tdm | republish
//                    (default: a verdict for each of the five)
//   --agent          user-agent token of the user's scraper (default "*")
//   --volume         pages to collect, e.g. 50 or 200/day; from 1000 pages
//                    any purpose counts as substantial extraction
//   --personal-data  likely: the page holds personal data even if the script
//                    saw no sign of it (can only make the verdict stricter)
//   --classify       the model's classification of the extracted clauses:
//                    {"<id>": "prohibited|allowed|conditional|unrelated"} or
//                    {"<id>": {"<purpose>": "<label>", …}}, inline or a file
//   --datagouv       also search data.gouv.fr for datasets of this domain
//                    (sends the domain name to data.gouv.fr; off by default)
//   --offline        send nothing; use the files the user pasted instead
//                    (any *-file option implies it)
//   --json           machine-readable output (schema 2)
//
// Online, reads at most robots.txt, the page, /.well-known/tdmrep.json,
// /.well-known/api-catalog, the home page and 3 pages of terms, one at a time,
// and respects robots.txt for its own reads. Node 18+, no dependencies.
// Not legal advice.

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createContext } from "./lib/context.mjs";
import { decide, labelFor, PURPOSES, LABELS } from "./lib/verdict.mjs";
import { checkRobots } from "./check-robots.mjs";
import { checkPage } from "./check-page.mjs";
import { checkTdm } from "./check-tdm.mjs";
import { detectLicence } from "./detect-licence.mjs";
import { detectPublicBody } from "./detect-public-body.mjs";
import { findAlternatives } from "./find-alternatives.mjs";
import { findTerms } from "./find-terms.mjs";
import { extract } from "./extract-clauses.mjs";
import { factsDates, freshness } from "./lib/freshness.mjs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const SCHEMA = 2;
export const DISCLAIMER = "We are not lawyers and this is not legal advice. This verdict only reflects the machine-readable signals the site published and the passages of its terms of use that mention scraping-related words, read on the day of the check; it can miss or misread clauses. Before collecting or reusing this data, have your project checked by a lawyer.";

export function parseVolume(v) {
  const m = String(v ?? "").match(/^(\d+)(?:\/(hour|day|week|month))?$/);
  return m ? { pages: Number(m[1]), per: m[2] ?? null } : null;
}

// "Name: value" lines (a pasted response, status line allowed) -> { name: value }.
export function parseHeaders(text) {
  const out = {};
  for (const line of String(text ?? "").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9-]+)\s*:\s*(.*)$/);
    if (m) out[m[1].toLowerCase()] = m[2].trim();
  }
  return out;
}

// Validates the model's classification: { id: label } or { id: { purpose|"*": label } }.
export function parseClassification(input) {
  if (input == null || input === "") return {};
  const raw = typeof input === "string" ? JSON.parse(input) : input;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("--classify expects a JSON object keyed by clause id");
  const out = {};
  for (const [id, value] of Object.entries(raw)) {
    const entry = typeof value === "string" ? { "*": value } : value;
    if (!entry || typeof entry !== "object") throw new Error(`--classify: bad value for ${id}`);
    for (const [purpose, label] of Object.entries(entry)) {
      if (purpose !== "*" && !PURPOSES.includes(purpose)) throw new Error(`--classify: unknown purpose "${purpose}" for ${id}`);
      if (!LABELS.includes(label)) throw new Error(`--classify: unknown label "${label}" for ${id} (use ${LABELS.join(", ")})`);
    }
    out[id] = entry;
  }
  return out;
}

// deps.fetch / deps.pause: for tests (fake hosts, no pause).
export async function analyze(target, { purpose = null, agent = "*", volume = null, personalData = null, datagouv = false, classification = {}, offline = null } = {}, deps = {}) {
  classification = parseClassification(classification);
  const ctx = createContext(target, { agent, datagouv, offline, ...deps });
  const robots = await checkRobots(ctx);
  const page = await checkPage(ctx);
  const tdm = await checkTdm(ctx);
  const licence = await detectLicence(ctx);
  const publicBody = detectPublicBody(ctx);
  const alternatives = await findAlternatives(ctx);
  const termsFound = await findTerms(ctx);
  const extracted = extract(termsFound.pages);

  const personal = { ...page.personal_data, declared: personalData === "likely" };
  if (personal.declared) { personal.level = "likely"; personal.evidence = [...personal.evidence, "declared by the user"]; }

  const known = new Set(extracted.clauses.map((c) => c.id));
  const terms = {
    found: termsFound.found,
    read: termsFound.read,
    source: termsFound.source,
    reason: termsFound.reason ?? (termsFound.pages.filter((p) => !p.read).map((p) => `${p.url}: ${p.reason}`).join("; ") || null),
    pages: termsFound.pages.map(({ body, html, ...p }) => p),
    clauses: extracted.clauses.map((c) => ({ ...c, classification: classification[c.id] ?? null })),
    clauses_total: extracted.total,
    truncated: extracted.truncated,
    unknown_ids: Object.keys(classification).filter((id) => !known.has(id)),
  };

  const signals = { robots, page, tdm, licence, public_body: publicBody, personal_data: personal, terms, alternatives };
  const purposes = purpose ? [purpose] : PURPOSES;
  const verdicts = purposes.map((p) => decide(signals, p, { pages: volume?.pages ?? null }));

  const unverified = [];
  if (offline) unverified.push(`offline mode: only what was pasted was checked (${["robots", "page", "headers", "terms"].filter((k) => offline[k] == null || (k === "headers" && !Object.keys(offline.headers ?? {}).length)).join(", ") || "nothing"} not provided)`);
  if (!terms.read) unverified.push(`terms of use (${terms.reason})`);
  const toClassify = terms.clauses.filter((c) => purposes.some((p) => labelFor(c, p) === null));
  if (toClassify.length) unverified.push(`classification of ${toClassify.length} clause(s) of the terms: classify them and run again with --classify`);
  if (terms.truncated) unverified.push(`only the first ${terms.clauses.length} of ${terms.clauses_total} matching clauses were kept`);
  if (terms.unknown_ids.length) unverified.push(`classified ids not found in the terms (page changed?): ${terms.unknown_ids.join(", ")}`);
  if (!page.read) unverified.push(`the page itself (${page.reason})`);
  if (tdm.file.state === "not read" || tdm.file.state === "invalid") unverified.push(`tdmrep.json (${tdm.file.reason})`);
  if (personal.level !== "likely") unverified.push("personal data: the script only looks for obvious signs; check the content");

  const facts = freshness(await factsDates());
  if (facts.stale) unverified.unshift(`legal facts of this copy last checked ${facts.checked ?? "(date missing)"}${facts.age_days !== null ? `, ${facts.age_days} days ago` : ""}: laws and decisions may have changed; update the plugin`);

  return {
    schema: SCHEMA,
    url: ctx.url.href,
    checked_on: new Date().toISOString().slice(0, 10),
    mode: offline ? "offline" : "online",
    agent,
    volume,
    verdicts,
    signals,
    unverified,
    requests: ctx.http.log,
    facts,
    disclaimer: DISCLAIMER,
  };
}

function printText(report) {
  const icon = { green: "GREEN ", orange: "ORANGE", red: "RED   " };
  console.log(`URL: ${report.url}   agent: ${report.agent}${report.volume ? `   volume: ${report.volume.pages}${report.volume.per ? "/" + report.volume.per : ""}` : ""}${report.mode === "offline" ? "   (offline)" : ""}\n`);
  for (const v of report.verdicts) {
    console.log(`${icon[v.verdict]}  ${v.purpose}`);
    for (const r of v.reasons) console.log(`        ${r.code}  ${r.detail}`);
    for (const p of v.positives) console.log(`        +${p.code} ${p.detail}`);
    for (const c of v.covered) console.log(`        (${c.code} covered by ${c.by.join(", ")})`);
    for (const n of v.notes) console.log(`        note: ${n}`);
  }
  const s = report.signals;
  const alt = s.alternatives;
  const allowed = s.robots.path_allowed === null ? "not checked" : s.robots.path_allowed ? "allowed" : "disallowed";
  console.log("\nSignals");
  console.log(`  robots.txt     ${s.robots.state} (HTTP ${s.robots.status ?? s.robots.error}); path ${allowed} for ${s.robots.group ?? "any agent (no rules)"}${s.robots.by ? ` by ${s.robots.by}` : ""}; crawl-delay ${s.robots.crawl_delay ?? "none"}`);
  console.log(`  AI training    blocked: ${s.robots.ai_training_blocked.join(", ") || "none"}`);
  console.log(`  page           ${s.page.read ? `HTTP ${s.page.status}${s.page.js_required ? ", needs JavaScript" : ""}; X-Robots-Tag ${s.page.x_robots_tag ?? "none"}; meta robots ${s.page.meta_robots?.join(", ") || "none"}` : `not read (${s.page.reason})`}`);
  console.log(`  protection     ${s.page.protection.map((p) => `${p.kind} (${p.evidence})`).join(", ") || "none seen"}`);
  console.log(`  TDM            ${s.tdm.reserved === null ? "unset" : s.tdm.reserved ? `reserved (${s.tdm.source})` : `not reserved (${s.tdm.source})`}; tdmrep.json ${s.tdm.file.state}`);
  console.log(`  licence        data: ${s.licence.data.map((l) => l.id).join(", ") || "none"}; site: ${s.licence.site.map((l) => l.id).join(", ") || "none"}${s.licence.all_rights_reserved ? "; \"all rights reserved\"" : ""}`);
  console.log(`  public body    ${s.public_body.public ? s.public_body.body : "no"}`);
  console.log(`  personal data  ${s.personal_data.level}${s.personal_data.evidence.length ? ` (${s.personal_data.evidence.join("; ")})` : ""}`);
  console.log(`  terms of use   ${s.terms.read ? `${s.terms.pages.filter((p) => p.read).map((p) => p.url).join(", ")}; ${s.terms.clauses.length ? `${s.terms.clauses.length} clause(s) to classify` : "no clause about scraping, robots or reuse"}` : `not read (${s.terms.reason})`}`);
  console.log(`  alternatives   api-catalog: ${alt.api_catalog.items.join(", ") || alt.api_catalog.state}; links: ${alt.page_links.map((l) => l.href).join(", ") || "none"}; feeds: ${alt.feeds.length}; sitemaps: ${alt.sitemaps.length}${alt.datagouv.datasets ? `; data.gouv.fr: ${alt.datagouv.datasets.map((d) => d.url).join(", ") || "none"}` : ""}`);
  if (s.terms.clauses.length) {
    console.log("\nClauses of the terms (classify each one for the purpose: prohibited / allowed / conditional / unrelated)");
    for (const c of s.terms.clauses) {
      const label = c.classification ? ` [${Object.entries(c.classification).map(([p, l]) => `${p}: ${l}`).join(", ")}]` : "";
      console.log(`  ${c.id}${label}  ${c.heading ? `(${c.heading}) ` : ""}"${c.quote}"`);
    }
  }
  console.log(`\nNot verified: ${report.unverified.join("; ") || "nothing listed"}`);
  console.log(`Requests sent: ${report.requests.length}${report.requests.length ? ` (${report.requests.map((r) => `${r.status ?? r.error} ${r.url}`).join(", ")})` : ""}`);
  console.log(`Legal facts checked: ${report.facts.checked ?? "unknown"}${report.facts.stale ? `  ** older than ${report.facts.max_age_days} days or incomplete: update the plugin **` : ""}`);
  console.log(`\n${report.disclaimer}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const opts = {};
  const files = {};
  let offline = false;
  let json = false;
  let target;
  const usage = (msg) => {
    if (msg) console.error(`error: ${msg}`);
    console.error("usage: node run-all.mjs <URL> [--purpose lookup|monitor|bulk|ai-tdm|republish] [--agent token] [--volume N[/period]] [--personal-data likely] [--classify JSON|file] [--datagouv] [--offline] [--robots-file f] [--page-file f] [--headers-file f] [--terms-file f] [--json]");
    process.exit(2);
  };
  const value = (i, name) => args[i] ?? usage(`${name} needs a value`);
  try {
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === "--json") json = true;
      else if (a === "--datagouv") opts.datagouv = true;
      else if (a === "--offline") offline = true;
      else if (a === "--purpose") { opts.purpose = value(++i, a); if (!PURPOSES.includes(opts.purpose)) usage(`unknown purpose "${opts.purpose}"`); }
      else if (a === "--agent") opts.agent = value(++i, a);
      else if (a === "--volume") { opts.volume = parseVolume(value(++i, a)); if (!opts.volume) usage("--volume expects N or N/hour|day|week|month"); }
      else if (a === "--personal-data") { opts.personalData = value(++i, a); if (opts.personalData !== "likely") usage('--personal-data only accepts "likely"'); }
      else if (a === "--classify") { const v = value(++i, a); opts.classification = parseClassification(v.trim().startsWith("{") ? v : await readFile(v, "utf8")); }
      else if (/^--(robots|page|headers|terms)-file$/.test(a)) {
        const f = value(++i, a);
        if (!existsSync(f)) usage(`no such file: ${f}`);
        files[a.slice(2, -5)] = await readFile(f, "utf8");
      }
      else if (a.startsWith("--")) usage(`unknown option ${a}`);
      else if (target) usage();
      else target = a;
    }
    if (!target) usage();
    if (offline || Object.keys(files).length) opts.offline = { robots: files.robots ?? null, page: files.page ?? null, headers: parseHeaders(files.headers), terms: files.terms ?? null };
    const report = await analyze(target, opts);
    if (json) console.log(JSON.stringify(report, null, 2));
    else printText(report);
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(1);
  }
}
