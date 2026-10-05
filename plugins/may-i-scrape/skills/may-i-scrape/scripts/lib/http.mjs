// The skill's own reads, kept polite: one request at a time with a pause, an
// honest user agent, robots.txt respected for every page it reads (RFC 9309),
// a cap on the number of requests and on the size of each response.
// Never retries, never changes its user agent, never solves a challenge.

import { parse, groupsFor, decide } from "./robots.mjs";

export const TOKEN = "may-i-scrape";
export const UA = `${TOKEN} (Claude Code skill; checks whether a site's data may be collected, on behalf of a user)`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The page's charset: Content-Type header, else <meta charset> / http-equiv in
// the first bytes, else UTF-8. Latin-1 pages decoded as UTF-8 lose their
// accents, and French keywords stop matching (seen on a real site).
export function charsetOf(contentType, head) {
  const fromHeader = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType ?? "")?.[1];
  const fromMeta = /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(head)?.[1];
  const name = (fromHeader ?? fromMeta ?? "utf-8").toLowerCase();
  try { new TextDecoder(name); return name; } catch { return "utf-8"; }
}

async function readCapped(res, maxBytes) {
  if (!res.body) return "";
  const chunks = [];
  let bytes = 0;
  for await (const chunk of res.body) {
    chunks.push(chunk);
    bytes += chunk.byteLength;
    if (bytes > maxBytes) break;   // leaving the loop cancels the stream
  }
  const all = Buffer.concat(chunks.map((c) => Buffer.from(c.buffer, c.byteOffset, c.byteLength)));
  const charset = charsetOf(res.headers.get("content-type"), all.subarray(0, 2048).toString("latin1"));
  return new TextDecoder(charset).decode(all);
}

export const NOT_PROVIDED = "not provided (offline mode)";

// Offline mode: nothing is sent; only what the user pasted is "served".
// offline = { pageUrl, page, headers: {name: value}, robots }
function offlineAnswer(url, offline) {
  const u = new URL(url);
  if (u.pathname === "/robots.txt" && offline.robots != null) return { url, status: 200, headers: { "content-type": "text/plain" }, body: offline.robots };
  if (url === offline.pageUrl && offline.page != null) return { url, status: 200, headers: { "content-type": "text/html", ...offline.headers }, body: offline.page };
  if (url === offline.pageUrl && Object.keys(offline.headers ?? {}).length) return { url, status: 200, headers: offline.headers, body: "" };
  return { url, status: null, error: NOT_PROVIDED, headers: {}, body: "" };
}

export function createClient({ fetch = globalThis.fetch, pause = 1000, timeout = 15000, maxRequests = 12, maxBytes = 2_000_000, offline = null } = {}) {
  const log = [];            // every request sent: { url, status } or { url, error }
  const robotsByOrigin = new Map();
  let queue = Promise.resolve();
  let last = 0;

  // One request, no automatic redirect, queued behind the previous one.
  function send(url, accept) {
    if (offline) return Promise.resolve(offlineAnswer(url, offline));
    const job = queue.then(async () => {
      if (log.length >= maxRequests) return { url, status: null, error: "request budget reached", headers: {}, body: "" };
      const wait = last + pause - Date.now();
      if (wait > 0) await sleep(wait);
      try {
        const res = await fetch(url, { redirect: "manual", headers: { "user-agent": UA, accept }, signal: AbortSignal.timeout(timeout) });
        const body = await readCapped(res, maxBytes);
        log.push({ url, status: res.status });
        return { url, status: res.status, headers: Object.fromEntries(res.headers), body };
      } catch (e) {
        const error = e.cause?.code ?? e.name ?? String(e);
        log.push({ url, error });
        return { url, status: null, error, headers: {}, body: "" };
      } finally {
        last = Date.now();
      }
    });
    queue = job.catch(() => {});
    return job;
  }

  // RFC 9309: follow 5 redirects; 4xx = "unavailable" (no restriction);
  // 5xx or no answer = "unreachable" (assume everything is disallowed).
  function robotsFor(origin) {
    if (!robotsByOrigin.has(origin)) {
      robotsByOrigin.set(origin, (async () => {
        let url = `${origin}/robots.txt`;
        let r;
        for (let hops = 0; hops <= 5; hops++) {
          r = await send(url, "text/plain,*/*");
          if (r.status >= 300 && r.status < 400 && r.headers.location) { url = new URL(r.headers.location, url).href; continue; }
          break;
        }
        // Still redirecting after 5 hops counts as unavailable (RFC 9309, 2.3.1.2).
        const state = r.error === NOT_PROVIDED ? "not provided"
          : r.status >= 200 && r.status < 300 ? "ok" : r.status >= 300 && r.status < 500 ? "unavailable" : "unreachable";
        return { url, status: r.status, error: r.error ?? null, state, text: state === "ok" ? r.body : "", parsed: parse(state === "ok" ? r.body : "") };
      })());
    }
    return robotsByOrigin.get(origin);
  }

  async function allowedForUs(url) {
    const robots = await robotsFor(url.origin);
    if (robots.state === "unreachable") return { allowed: false, by: `robots.txt unreachable (${robots.status ?? robots.error})` };
    return decide(url.pathname + url.search, groupsFor(TOKEN, robots.parsed.groups).rules);
  }

  // GET with redirects followed by hand; each hop is checked against the
  // robots.txt of its own origin unless { robots: false } (official APIs).
  async function get(target, { robots = true, accept = "text/html,application/xhtml+xml,*/*" } = {}) {
    let url = new URL(target);
    const redirects = [];
    for (let hops = 0; hops <= 5; hops++) {
      if (robots) {
        const rule = await allowedForUs(url);
        if (!rule.allowed) return { url: url.href, skipped: `robots.txt disallows this tool (${rule.by})`, redirects, status: null, headers: {}, body: "" };
      }
      const r = await send(url.href, accept);
      if (r.status >= 300 && r.status < 400 && r.headers.location) {
        redirects.push({ from: url.href, status: r.status });
        url = new URL(r.headers.location, url);
        continue;
      }
      return { ...r, url: url.href, redirects };
    }
    return { url: url.href, error: "too many redirects", redirects, status: null, headers: {}, body: "" };
  }

  return { get, robotsFor, log };
}
