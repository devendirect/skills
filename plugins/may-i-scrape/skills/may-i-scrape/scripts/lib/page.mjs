// Small HTML helpers on top of html.mjs (which is shared with seo-geo-audit
// and must stay identical to its source).

import { attrs, decode } from "./html.mjs";

const strip = (s) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

export function metas(html) {
  const head = html.match(/<head[\s>][\s\S]*?<\/head>/i)?.[0] ?? html;
  return [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => attrs(m[0]));
}

export function meta(html, name) {
  return metas(html).find((m) => (m.name ?? "").toLowerCase() === name)?.content ?? null;
}

export function anchors(html) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((m) => {
    const a = attrs(`<a ${m[1]}>`);
    return { href: a.href ?? "", rel: (a.rel ?? "").toLowerCase(), text: strip(m[2]) };
  });
}

export function links(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0]));
}

// Every object node found in the page's JSON-LD blocks.
export function jsonldNodes(analysis) {
  const out = [];
  const walk = (n) => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (n && typeof n === "object") { out.push(n); Object.values(n).forEach(walk); }
  };
  for (const block of analysis.jsonld) if (block.valid) walk(block.raw);
  return out;
}

export const types = (node) => [].concat(node["@type"] ?? []).map(String);

// Visible text of the <footer>s, or of the end of the page when there is none.
export function footerText(html) {
  const footers = [...html.matchAll(/<footer\b[\s\S]*?<\/footer>/gi)].map((m) => strip(m[0]));
  return footers.length ? footers.join(" ") : strip(html.slice(-4000));
}
