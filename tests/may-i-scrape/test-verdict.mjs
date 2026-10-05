#!/usr/bin/env node
// Unit tests of the decision table (lib/verdict.mjs) on hand-made signals,
// including the green cases no fixture can reach before terms are read
// (phase 2).
//
// Usage: node test-verdict.mjs
// Node 18+, no dependencies.

import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const { decide, PURPOSES } = await import(pathToFileURL(join(here, "..", "..", "plugins", "may-i-scrape", "skills", "may-i-scrape", "scripts", "lib", "verdict.mjs")).href);

// Neutral signals: robots allows, page read, nothing else; terms read and found, no clause.
function signals(over = {}) {
  const base = {
    robots: { state: "ok", path: "/p", group: "*", path_allowed: true, by: null, ai_training_blocked: [] },
    page: { read: true, ok: true, status: 200, protection: [] },
    tdm: { reserved: null, source: null, policy: null },
    licence: { site: [], data: [] },
    public_body: { public: false },
    personal_data: { level: "not detected", evidence: [] },
    terms: { read: true, found: true, clauses: [] },
  };
  for (const [k, v] of Object.entries(over)) base[k] = { ...base[k], ...v };
  return base;
}
const LO = { id: "Licence-Ouverte", nc: false, nd: false, sa: false };
const NC = { id: "CC-BY-NC-4.0", nc: true, nd: false, sa: false };

const cases = [
  ["nothing positive -> orange O7", signals(), "monitor", "orange", ["O7"]],
  ["lookup, robots ok, terms read without clause -> green G4", signals(), "lookup", "green", [], ["G4"]],
  ["lookup but terms not read -> orange O6", signals({ terms: { read: false } }), "lookup", "orange", ["O6"]],
  ["lookup but terms not found -> orange O6", signals({ terms: { found: false } }), "lookup", "orange", ["O6"]],
  ["robots disallow -> red R1", signals({ robots: { path_allowed: false, by: "Disallow: /" } }), "lookup", "red", ["R1"]],
  ["robots unreachable -> red R1", signals({ robots: { state: "unreachable", status: 503, path_allowed: false } }), "monitor", "red", ["R1"]],
  ["open data licence, bulk -> green G1 (O4 covered)", signals({ licence: { data: [LO] } }), "bulk", "green", [], ["G1"], ["O4"]],
  ["open data licence, republish -> green (O5 covered)", signals({ licence: { data: [LO] } }), "republish", "green", [], ["G1"], ["O5"]],
  ["NC licence, republish -> orange O5", signals({ licence: { data: [NC] } }), "republish", "orange", ["O5", "O7"]],
  ["NC licence, bulk -> green with a note", signals({ licence: { data: [NC] } }), "bulk", "green", [], ["G1"], ["O4"]],
  ["site-only licence does not count", signals({ licence: { site: [LO] } }), "bulk", "orange", ["O4", "O7"]],
  ["public body, republish -> green G2", signals({ public_body: { public: true, body: "gouv.fr" } }), "republish", "green", [], ["G2"], ["O5"]],
  ["public body + personal data -> orange O1", signals({ public_body: { public: true, body: "gouv.fr" }, personal_data: { level: "likely", evidence: ["x"] } }), "republish", "orange", ["O1"]],
  ["licence + protection -> orange O2", signals({ licence: { data: [LO] }, page: { protection: [{ kind: "challenge", evidence: "x" }] } }), "bulk", "orange", ["O2"]],
  ["TDM reserved, ai-tdm -> red R2", signals({ tdm: { reserved: true, source: "file" }, licence: { data: [LO] } }), "ai-tdm", "red", ["R2"]],
  ["TDM reserved, bulk -> orange O3", signals({ tdm: { reserved: true, source: "file" } }), "bulk", "orange", ["O3"]],
  ["TDM reserved, lookup -> no O3, a note (green possible)", signals({ tdm: { reserved: true, source: "file" } }), "lookup", "green", [], ["G4"]],
  ["AI crawlers blocked, monitor -> no O3", signals({ robots: { ai_training_blocked: ["GPTBot"] } }), "monitor", "orange", ["O7"]],
  ["AI bots blocked, ai-tdm -> red R3", signals({ robots: { ai_training_blocked: ["GPTBot"] } }), "ai-tdm", "red", ["R3"]],
  ["prohibited clause -> red R4", signals({ terms: { clauses: [{ id: "c1", classification: { "*": "prohibited" }, quote: "No scraping." }] } }), "lookup", "red", ["R4"]],
  ["prohibited clause for another purpose only", signals({ licence: { data: [LO] }, terms: { clauses: [{ id: "c1", classification: { republish: "prohibited", bulk: "unrelated" }, quote: "No resale." }] } }), "bulk", "green", [], ["G1"]],
  ["conditional clause -> orange O6, no G4", signals({ terms: { clauses: [{ id: "c1", classification: { "*": "conditional" }, quote: "With permission." }] } }), "lookup", "orange", ["O6", "O7"]],
  ["page not read -> orange O8", signals({ licence: { data: [LO] }, page: { read: false, ok: false, reason: "robots.txt disallows this tool" } }), "bulk", "orange", ["O8"]],
  ["unclassified clause -> orange O6, no G4", signals({ terms: { clauses: [{ id: "c1", classification: null, quote: "Robots are not welcome." }] } }), "lookup", "orange", ["O6"]],
  ["clause classified for another purpose only stays unclassified here", signals({ terms: { clauses: [{ id: "c1", classification: { bulk: "unrelated" }, quote: "x" }] } }), "lookup", "orange", ["O6"]],
  ["unrelated clause does not block G4", signals({ terms: { clauses: [{ id: "c1", classification: { "*": "unrelated" }, quote: "Cookies." }] } }), "lookup", "green", [], ["G4"]],
  ["terms allow bulk -> green G5 (O4 covered)", signals({ terms: { clauses: [{ id: "c1", classification: { bulk: "allowed" }, quote: "Automated reuse allowed." }] } }), "bulk", "green", [], ["G5"], ["O4"]],
  ["terms allow, but personal data -> orange O1", signals({ personal_data: { level: "likely", evidence: ["x"] }, terms: { clauses: [{ id: "c1", classification: { "*": "allowed" }, quote: "x" }] } }), "republish", "orange", ["O1"], ["G5"]],
  ["allowed and prohibited clauses -> red", signals({ terms: { clauses: [{ id: "c1", classification: { "*": "allowed" }, quote: "a" }, { id: "c2", classification: { "*": "prohibited" }, quote: "b" }] } }), "monitor", "red", ["R4"]],
  ["robots.txt not provided (offline) -> orange O9", signals({ robots: { path_allowed: null, by: "robots.txt not provided (offline mode)" }, licence: { data: [LO] } }), "bulk", "orange", ["O9"]],
  ["volume >= 1000 makes lookup substantial", signals(), "lookup", "orange", ["O4"], [], [], { pages: 1000 }],
];

let failed = 0;
for (const [label, s, purpose, verdict, reasons = [], positives = [], covered = [], opts = {}] of cases) {
  const v = decide(s, purpose, opts);
  const codes = (l) => l.map((x) => x.code);
  const errors = [];
  if (v.verdict !== verdict) errors.push(`verdict ${v.verdict}, expected ${verdict}`);
  for (const c of reasons) if (!codes(v.reasons).includes(c)) errors.push(`reasons lack ${c}`);
  for (const c of positives) if (!codes(v.positives).includes(c)) errors.push(`positives lack ${c}`);
  for (const c of covered) if (!codes(v.covered).includes(c)) errors.push(`covered lacks ${c}`);
  if (v.verdict === "green" && !v.positives.length) errors.push("green without a positive signal");
  if (errors.length) { failed++; console.log(`FAIL ${label}: ${errors.join("; ")} (reasons: ${codes(v.reasons).join(", ") || "none"})`); }
  else console.log(`ok   ${label}`);
}

// Property: whatever the signals, no green without a positive signal.
let combos = 0;
for (const allowed of [true, false]) for (const tdm of [null, true, false]) for (const pd of ["likely", "not detected"])
  for (const terms of [{ read: false }, { read: true, found: false }, { read: true, found: true, clauses: [] }])
    for (const purpose of PURPOSES) {
      combos++;
      const v = decide(signals({ robots: { path_allowed: allowed }, tdm: { reserved: tdm }, personal_data: { level: pd, evidence: [] }, terms }), purpose);
      if (v.verdict === "green" && !v.positives.length) { failed++; console.log(`FAIL property: green without positive (${purpose})`); }
    }
console.log(`ok   no green without a positive signal (${combos} combinations)`);

console.log(`\n${cases.length + 1 - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
