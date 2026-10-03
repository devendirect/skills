// robots.txt parsing and matching, shared by robots-check.mjs and compare.mjs.
// Follows RFC 9309: a crawler uses the group(s) whose user-agent equals its
// token (case-insensitive), else the "*" group; within a group the longest
// matching rule wins, and Allow wins a tie. Supports "*" and "$" in paths.

export function parse(text) {
  const groups = [];   // { agents: [lowercase], rules: [{ allow, pattern }] }
  const sitemaps = [];
  let current = null;
  let lastWasAgent = false;
  for (let raw of text.replace(/^﻿/, "").split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      if (!lastWasAgent || !current) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (key === "allow" || key === "disallow") {
      lastWasAgent = false;
      if (!current) continue;           // rule before any user-agent: ignored
      if (value === "") continue;       // empty Disallow = no restriction
      current.rules.push({ allow: key === "allow", pattern: value });
    } else {
      if (key === "sitemap") sitemaps.push(value);
      lastWasAgent = false;
    }
  }
  return { groups, sitemaps };
}

export function groupsFor(token, groups) {
  const t = token.toLowerCase();
  const own = groups.filter((g) => g.agents.includes(t));
  if (own.length) return { matched: token, rules: own.flatMap((g) => g.rules) };
  const star = groups.filter((g) => g.agents.includes("*"));
  if (star.length) return { matched: "*", rules: star.flatMap((g) => g.rules) };
  return { matched: null, rules: [] };
}

export function patternToRegex(pattern) {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp("^" + body + (anchored ? "$" : ""));
}

export function decide(path, rules) {
  let best = null;
  for (const r of rules) {
    if (!patternToRegex(r.pattern).test(path)) continue;
    const len = r.pattern.length;
    if (!best || len > best.len || (len === best.len && r.allow && !best.rule.allow)) best = { rule: r, len };
  }
  return best ? { allowed: best.rule.allow, by: `${best.rule.allow ? "Allow" : "Disallow"}: ${best.rule.pattern}` } : { allowed: true, by: null };
}
