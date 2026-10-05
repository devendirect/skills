// One analysis = one target URL, one polite client, and each resource read at
// most once, whichever check asks for it first.

import { createClient } from "./http.mjs";
import { analyzeHtml } from "./html.mjs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export function normalizeTarget(target) {
  const url = new URL(target);
  if (!/^https?:$/.test(url.protocol)) throw new Error(`not an http(s) URL: ${target}`);
  url.hash = "";
  return url;
}

// offline = { page, headers, robots, terms }: texts pasted by the user; no request is sent.
export function createContext(target, { agent = "*", fetch, pause, datagouv = false, offline = null } = {}) {
  const url = normalizeTarget(target);
  const http = createClient({ fetch, pause, offline: offline && { ...offline, pageUrl: url.href } });
  const once = (fn) => { let p; return () => (p ??= fn()); };
  const page = once(() => http.get(url.href));
  // The page's HTML, or "" when it was not read or is not HTML.
  const html = once(async () => {
    const p = await page();
    return p.status >= 200 && p.status < 300 && /html|xml/i.test(p.headers["content-type"] ?? "html") ? p.body : "";
  });
  return {
    url,
    path: url.pathname + url.search,
    agent,
    datagouv: datagouv && !offline,
    offline,
    http,
    robots: once(() => http.robotsFor(url.origin)),
    page,
    html,
    analysis: once(async () => analyzeHtml(await html())),
  };
}

// Lets each check run on its own: node check-xxx.mjs <URL> [--agent token] [--datagouv]
export async function standalone(metaUrl, fn) {
  if (!process.argv[1] || fileURLToPath(metaUrl) !== resolve(process.argv[1])) return;
  const args = process.argv.slice(2);
  const i = args.indexOf("--agent");
  const agent = i >= 0 ? args.splice(i, 2)[1] : "*";
  const d = args.indexOf("--datagouv");
  if (d >= 0) args.splice(d, 1);
  if (args.length !== 1 || !agent) {
    console.error("usage: node <check>.mjs <URL> [--agent token] [--datagouv]");
    process.exit(2);
  }
  try {
    const ctx = createContext(args[0], { agent, datagouv: d >= 0 });
    console.log(JSON.stringify({ ...(await fn(ctx)), requests: ctx.http.log }, null, 2));
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(1);
  }
}
