#!/usr/bin/env node
// robots.txt for the target path: the rules for the user's scraper (its
// user-agent token, else "*"), for AI training crawlers, Crawl-delay, sitemaps.
//
// Usage: node check-robots.mjs <URL> [--agent token]
// RFC 9309 matching (lib/robots.mjs): own group else "*", longest rule wins,
// Allow wins a tie, "*" and "$" supported. Node 18+, no dependencies.

import { readFile } from "node:fs/promises";
import { groupsFor, decide } from "./lib/robots.mjs";
import { standalone } from "./lib/context.mjs";

const crawlers = JSON.parse(await readFile(new URL("ai-crawlers.json", import.meta.url), "utf8"));
const TRAINING = new Set(["training", "mixed"]);

// lib/robots.mjs ignores Crawl-delay (not in RFC 9309); read it here.
// Returns { lowercase agent: seconds }.
function crawlDelays(text) {
  const out = {};
  let agents = [];
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.replace(/#.*$/, "").trim().match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key === "user-agent") {
      if (!lastWasAgent) agents = [];
      agents.push(m[2].trim().toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (key === "crawl-delay" && Number.isFinite(Number(m[2]))) for (const a of agents) out[a] = Number(m[2]);
  }
  return out;
}

export async function checkRobots(ctx) {
  const r = await ctx.robots();
  const { groups, sitemaps } = r.parsed;
  // RFC 9309 treats any 4xx as "unavailable" (no rule applies), but 401, 403,
  // 418 and 429 on robots.txt mean the site is blocking scripts (seen on real
  // sites): the rules could not be read, and that is an access restriction.
  const blocked = [401, 403, 418, 429].includes(r.status);
  const base = { url: r.url, status: r.status, error: r.error, state: r.state, blocked, agent: ctx.agent, path: ctx.path };

  if (r.state === "not provided") {
    return { ...base, group: null, path_allowed: null, by: "robots.txt not provided (offline mode)", crawl_delay: null, sitemaps: [], ai_training: [], ai_training_blocked: [], crawlers_checked: crawlers.checked };
  }
  if (r.state === "unreachable") {
    return { ...base, group: null, path_allowed: false, by: "robots.txt unreachable: RFC 9309 says to assume everything is disallowed", crawl_delay: null, sitemaps: [], ai_training: [], ai_training_blocked: [], crawlers_checked: crawlers.checked };
  }

  const own = groupsFor(ctx.agent, groups);
  const rule = decide(ctx.path, own.rules);
  const delays = crawlDelays(r.text);
  const crawlDelay = own.matched === null ? null : delays[own.matched.toLowerCase()] ?? null;

  const aiTraining = crawlers.agents.filter((a) => TRAINING.has(a.family)).map((a) => {
    const g = groupsFor(a.token, groups);
    return { token: a.token, operator: a.operator, group: g.matched, ...decide(ctx.path, g.rules) };
  });

  return {
    ...base,
    group: own.matched,
    path_allowed: rule.allowed,
    by: rule.by,
    crawl_delay: crawlDelay,
    sitemaps,
    ai_training: aiTraining,
    ai_training_blocked: aiTraining.filter((a) => !a.allowed).map((a) => a.token),
    crawlers_checked: crawlers.checked,
  };
}

await standalone(import.meta.url, checkRobots);
