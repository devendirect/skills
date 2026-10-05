// How old are the facts this copy of the skill relies on? Laws and court
// decisions change; an installed copy that was never updated must say so.
//
// Dates come from SKILL.md ("last checked on **YYYY-MM-DD**") and from each
// references/legal-*.md ("Last checked: **YYYY-MM-DD**"): the oldest one counts.

import { readFile, readdir } from "node:fs/promises";

export const MAX_AGE_DAYS = 183;   // about 6 months
const skillDir = new URL("../../", import.meta.url);
const DATE = /[Ll]ast checked(?: on)?:? \*\*(\d{4}-\d{2}-\d{2})\*\*/;

export async function factsDates() {
  const files = {};
  const skill = await readFile(new URL("SKILL.md", skillDir), "utf8").catch(() => "");
  files["SKILL.md"] = skill.match(DATE)?.[1] ?? null;
  const refs = new URL("references/", skillDir);
  for (const name of (await readdir(refs).catch(() => [])).filter((n) => /^legal-.*\.md$/.test(n)).sort()) {
    files[`references/${name}`] = (await readFile(new URL(name, refs), "utf8")).match(DATE)?.[1] ?? null;
  }
  return files;
}

// Pure: oldest date, its age in days on `today`, and whether it is too old.
// A missing date counts as stale: the copy cannot vouch for its facts.
export function freshness(files, today = new Date(), maxDays = MAX_AGE_DAYS) {
  const dates = Object.values(files);
  const missing = Object.entries(files).filter(([, d]) => !d).map(([f]) => f);
  const known = dates.filter(Boolean).sort();
  const oldest = known[0] ?? null;
  const age = oldest ? Math.floor((Date.parse(today.toISOString().slice(0, 10)) - Date.parse(oldest)) / 86400000) : null;
  return { checked: oldest, age_days: age, max_age_days: maxDays, stale: !oldest || missing.length > 0 || age > maxDays, missing, files };
}
