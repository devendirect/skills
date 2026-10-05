// The decision table (references/decision-table.md). Pure function: same
// signals, classification and purpose, same verdict. The model classifies the
// clauses of the terms of use; the rules stay here.
//
// Red if any R applies. Else orange if any O is left uncovered. Else green,
// which needs at least one positive signal (O7 makes sure of it).

export const PURPOSES = ["lookup", "monitor", "bulk", "ai-tdm", "republish"];
export const LABELS = ["prohibited", "allowed", "conditional", "unrelated"];
export const BULK_PAGES = 1000;   // --volume from which any purpose counts as substantial extraction (heuristic)

// Is a data licence compatible with the purpose? Republication covers resale,
// so a non-commercial or no-derivatives licence is not enough for it.
function compatible(licence, purpose) {
  return !(purpose === "republish" && (licence.nc || licence.nd));
}

const conditions = (l) => [l.nc && "non-commercial only", l.nd && "no derivatives", l.sa && "share-alike"].filter(Boolean);
const short = (q) => (q.length > 160 ? q.slice(0, 157) + "…" : q);

// The model's label for this clause and purpose: { purpose: label } or { "*": label }.
export const labelFor = (clause, purpose) => clause.classification?.[purpose] ?? clause.classification?.["*"] ?? null;

export function decide(s, purpose, { pages = null } = {}) {
  if (!PURPOSES.includes(purpose)) throw new Error(`unknown purpose: ${purpose}`);
  const red = [];
  const orange = [];
  const positives = [];
  const covered = [];
  const notes = [];
  const r = s.robots;
  const aiBlocked = r.ai_training_blocked ?? [];
  const tdmReserved = s.tdm.reserved === true;
  const terms = s.terms;
  const clauses = (terms.clauses ?? []).map((c) => ({ ...c, label: labelFor(c, purpose) }));
  const byLabel = (l) => clauses.filter((c) => c.label === l);

  // --- red ---------------------------------------------------------------
  if (r.path_allowed === false) {
    red.push({ code: "R1", detail: r.state === "unreachable"
      ? `robots.txt unreachable (${r.status ?? r.error}): RFC 9309 says to assume everything is disallowed`
      : `robots.txt disallows ${r.path} for ${r.group === "*" ? '"*"' : r.group} (${r.by})` });
  }
  if (purpose === "ai-tdm" && tdmReserved) red.push({ code: "R2", detail: `TDM rights reserved (TDMRep, from the ${s.tdm.source})${s.tdm.policy ? `, policy: ${s.tdm.policy}` : ""}` });
  if (purpose === "ai-tdm" && aiBlocked.length) red.push({ code: "R3", detail: `robots.txt blocks AI training crawlers on this path: ${aiBlocked.join(", ")}` });
  for (const c of byLabel("prohibited")) red.push({ code: "R4", detail: `terms (${c.id}): "${short(c.quote)}"` });

  // --- positive signals --------------------------------------------------
  const dataLicences = s.licence.data.filter((l) => compatible(l, purpose));
  if (dataLicences.length) {
    positives.push({ code: "G1", detail: `data licence: ${dataLicences.map((l) => l.id + (conditions(l).length ? ` (${conditions(l).join(", ")})` : "")).join(", ")}` });
    for (const l of dataLicences) if (conditions(l).length) notes.push(`${l.id}: ${conditions(l).join(", ")}.`);
  }
  if (s.public_body.public) positives.push({ code: "G2", detail: `public body: ${s.public_body.body}` });
  const unclassified = byLabel(null);
  if (purpose === "lookup" && r.path_allowed === true && terms.read && terms.found && !byLabel("prohibited").length && !byLabel("conditional").length && !unclassified.length) {
    positives.push({ code: "G4", detail: `one-off lookup, robots.txt allows the path, ${clauses.length ? "no restrictive clause in the terms" : "no clause about scraping, robots or reuse in the terms"}` });
  }
  for (const c of byLabel("allowed")) positives.push({ code: "G5", detail: `terms allow this use (${c.id}): "${short(c.quote)}"` });
  const coveredBy = (codes) => [...new Set(positives.filter((p) => codes.includes(p.code)).map((p) => p.code))];

  // --- orange ------------------------------------------------------------
  if (s.personal_data.level === "likely") orange.push({ code: "O1", detail: `personal data likely (${s.personal_data.evidence.join("; ")}): the GDPR applies (lawful basis, information, minimisation)` });
  const restrictions = [...(s.page.protection ?? []), ...(r.blocked ? [{ kind: "blocked", evidence: `robots.txt answered HTTP ${r.status}, its rules could not be read` }] : [])];
  if (restrictions.length) orange.push({ code: "O2", detail: `access restricted: ${restrictions.map((p) => `${p.kind} (${p.evidence})`).join(", ")}. Do not work around it; use an official alternative or ask the site` });
  // A TDM reservation or an AI-crawler block targets mining and AI training.
  // Bulk extraction is close to mining: orange. A lookup, a monitor or a
  // republication is not mining: shown as a note only (decided 2026-10-04,
  // after the real-site tests).
  if (purpose !== "ai-tdm" && (tdmReserved || aiBlocked.length)) {
    const what = [tdmReserved && "TDM rights reserved (TDMRep)", aiBlocked.length && `AI training crawlers blocked (${aiBlocked.join(", ")})`].filter(Boolean).join("; ");
    if (purpose === "bulk") orange.push({ code: "O3", detail: `${what}: the site objects to mining and AI use, and bulk extraction is close to mining` });
    else notes.push(`${what}: the site objects to mining and AI use; no effect on this purpose, but do not reuse the data for AI or mining.`);
  }
  const substantial = purpose === "bulk" || (pages !== null && pages >= BULK_PAGES);
  if (substantial) {
    const by = coveredBy(["G1", "G2", "G5"]);
    const o = { code: "O4", detail: `substantial extraction${purpose === "bulk" ? "" : ` (${pages} pages)`}: database right (sui generis) may apply` };
    by.length ? covered.push({ ...o, by }) : orange.push(o);
  }
  if (purpose === "republish") {
    const by = coveredBy(["G1", "G2", "G5"]);
    const o = { code: "O5", detail: "republication or resale: copyright and database right apply unless a licence allows it" };
    by.length ? covered.push({ ...o, by }) : orange.push(o);
  }
  if (!terms.read || !terms.found) orange.push({ code: "O6", detail: terms.found ? `terms of use found but not read (${terms.reason ?? "see pages"})` : `terms of use not found (${terms.reason ?? "no link"})` });
  for (const c of byLabel("conditional")) orange.push({ code: "O6", detail: `conditional clause in the terms (${c.id}): "${short(c.quote)}"` });
  if (unclassified.length) orange.push({ code: "O6", detail: `${unclassified.length} clause(s) of the terms not classified for this purpose: ${unclassified.map((c) => c.id).join(", ")}` });
  if (!positives.length) orange.push({ code: "O7", detail: "no positive signal: nothing explicitly allows this use" });
  if (!s.page.read || (!s.page.ok && !s.page.protection?.length)) orange.push({ code: "O8", detail: `page not checked: ${s.page.reason ?? `HTTP ${s.page.status}`}` });
  if (r.path_allowed === null) orange.push({ code: "O9", detail: `robots.txt not checked: ${r.by}` });

  const verdict = red.length ? "red" : orange.length ? "orange" : "green";
  return { purpose, verdict, reasons: [...red, ...orange], positives, covered, notes };
}
