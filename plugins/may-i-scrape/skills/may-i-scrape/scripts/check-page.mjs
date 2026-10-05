#!/usr/bin/env node
// The target page as served: status, X-Robots-Tag, meta robots, whether its
// content needs JavaScript, signs of protection (challenge page, captcha,
// login, paywall) and hints of personal data.
//
// Protections are recorded, never worked around: no retry, no other user
// agent, no challenge solving.
//
// Usage: node check-page.mjs <URL> [--agent token]
// Node 18+, no dependencies.

import { standalone } from "./lib/context.mjs";
import { anchors, jsonldNodes, types } from "./lib/page.mjs";

const PERSON_TYPES = new Set(["Person", "ProfilePage", "Review", "Comment"]);

function protections(p, html, analysis) {
  const out = [];
  const h = p.headers;
  const status = p.status;
  if (status === 401) out.push({ kind: "login", evidence: "HTTP 401" });
  if (status === 403 || status === 429 || status === 503) out.push({ kind: "blocked", evidence: `HTTP ${status}` });
  if ((h["cf-mitigated"] ?? "").toLowerCase() === "challenge" || /challenges\.cloudflare\.com|cf-chl-|<title>\s*just a moment/i.test(p.body)) {
    out.push({ kind: "challenge", evidence: "Cloudflare challenge page" });
  }
  // Challenge pages are often served with HTTP 200 (seen on real sites):
  // recognise the vendors by their markers, and any near-empty page that
  // mentions a challenge. Recorded, never solved.
  const cookies = h["set-cookie"] ?? "";
  const vendor =
    /_Incapsula_Resource/i.test(p.body) || "x-iinfo" in h || /incap_ses_|visid_incap_/.test(cookies) ? "Imperva / Incapsula"
    : "x-datadome" in h || /captcha-delivery\.com/i.test(p.body) ? "DataDome"
    : /_pxAppId|px-captcha|perimeterx/i.test(p.body) ? "PerimeterX / HUMAN"
    : "x-amzn-waf-action" in h || /awswaf/i.test(p.body) ? "AWS WAF"
    : null;
  if (vendor && analysis.words < 200 && !out.some((o) => o.kind === "challenge")) out.push({ kind: "challenge", evidence: `${vendor} challenge page` });
  else if (!vendor && analysis.words < 20 && /challenge/i.test(p.body) && !out.some((o) => o.kind === "challenge")) out.push({ kind: "challenge", evidence: "near-empty page mentioning a challenge" });
  // A captcha widget on a normal page (a contact form) is not a gate; count it
  // only on an error page or a near-empty one.
  if ((status >= 400 || analysis.words < 200) && /g-recaptcha|h-captcha|hcaptcha\.com|captcha-delivery\.com|datadome|px-captcha/i.test(p.body)) {
    out.push({ kind: "captcha", evidence: "captcha on a near-empty or error page" });
  }
  const finalPath = new URL(p.url).pathname;
  if (p.redirects.length && /\/(login|log-in|signin|sign-in|connexion|auth)\b/i.test(finalPath)) out.push({ kind: "login", evidence: `redirected to ${finalPath}` });
  else if (/<input\b[^>]*type\s*=\s*["']?password/i.test(html) && analysis.words < 300) out.push({ kind: "login", evidence: "password form on a near-empty page" });
  // schema.org markup that Google asks paywalled pages to use.
  if (jsonldNodes(analysis).some((n) => String(n.isAccessibleForFree).toLowerCase() === "false")) out.push({ kind: "paywall", evidence: "JSON-LD isAccessibleForFree: false" });
  return out;
}

function personalData(html, analysis) {
  const evidence = [];
  const hrefs = anchors(html).map((a) => a.href.toLowerCase());
  const mail = new Set(hrefs.filter((h) => h.startsWith("mailto:"))).size;
  const tel = new Set(hrefs.filter((h) => h.startsWith("tel:"))).size;
  const found = [...new Set(jsonldNodes(analysis).flatMap(types).filter((t) => PERSON_TYPES.has(t)))];
  if (found.length) evidence.push(`JSON-LD types: ${found.join(", ")}`);
  if (mail + tel >= 3) evidence.push(`${mail} mailto: and ${tel} tel: links`);
  return { level: evidence.length ? "likely" : "not detected", evidence };
}

export async function checkPage(ctx) {
  const p = await ctx.page();
  if (p.skipped || p.error) return { read: false, ok: false, reason: p.skipped ?? p.error, url: p.url, protection: [], personal_data: { level: "not assessed", evidence: [] } };

  const html = await ctx.html();
  const analysis = await ctx.analysis();
  return {
    read: true,
    ok: p.status >= 200 && p.status < 300,
    status: p.status,
    url: p.url,
    redirects: p.redirects,
    content_type: p.headers["content-type"] ?? null,
    x_robots_tag: p.headers["x-robots-tag"] ?? null,
    meta_robots: analysis.robots,
    js_required: analysis.emptyRoot || (html !== "" && analysis.words < 20 && /<script\b/i.test(html)),
    words: analysis.words,
    protection: protections(p, html, analysis),
    personal_data: personalData(html, analysis),
  };
}

await standalone(import.meta.url, checkPage);
