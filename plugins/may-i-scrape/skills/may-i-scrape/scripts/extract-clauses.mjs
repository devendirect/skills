#!/usr/bin/env node
// Keeps only the paragraphs of the terms of use that mention scraping,
// robots, extraction, databases, mining / AI or reuse (scripts/keywords.json),
// so the model reads a few quotes, not the whole document. Each clause gets a
// stable id (hash of its text) that the model uses to classify it.
//
// Usage: node extract-clauses.mjs <URL> [--agent token]
// Node 18+, no dependencies.

import { readFile } from "node:fs/promises";
import { decode } from "./lib/html.mjs";
import { standalone } from "./lib/context.mjs";
import { findTerms } from "./find-terms.mjs";

const keywords = JSON.parse(await readFile(new URL("keywords.json", import.meta.url), "utf8"));
const CATEGORIES = keywords.clauses.map((c) => ({ category: c.category, re: new RegExp(c.pattern, "i") }));
export const MAX_CLAUSES = 15;
const MAX_QUOTE = 700;
const MIN_LENGTH = 40;

// FNV-1a, 32 bits: short, stable ids.
export function clauseId(text) {
  let h = 0x811c9dc5;
  for (const ch of text.toLowerCase().replace(/\s+/g, " ")) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return "c" + h.toString(16).padStart(8, "0");
}

// Paragraphs with the heading they sit under.
function paragraphs(body, isHtml) {
  let text = body;
  if (isHtml) {
    text = body
      .replace(/<(script|style|noscript|template|svg|nav|header)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<h[1-6]\b[^>]*>/gi, "\n\n§H§")
      .replace(/<\/?(p|li|h[1-6]|div|section|article|br|tr|td|dd|dt|blockquote|ul|ol|table)\b[^>]*>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ");
    text = decode(text);
  }
  const out = [];
  let heading = null;
  for (const block of text.split(/\n\s*\n/)) {
    const t = block.replace(/\s+/g, " ").trim();
    if (!t) continue;
    if (t.startsWith("§H§")) { heading = t.slice(3).trim().slice(0, 120) || null; continue; }
    out.push({ heading, text: t });
  }
  return out;
}

const matches = (t) => CATEGORIES.filter((c) => c.re.test(t)).map((c) => c.category);

// A window of MAX_QUOTE characters around the first keyword of a long text.
function windowAround(text) {
  const at = Math.min(...CATEGORIES.map((c) => text.search(c.re)).filter((i) => i >= 0), text.length);
  const start = Math.max(0, Math.min(at - 200, text.length - MAX_QUOTE));
  return (start > 0 ? "… " : "") + text.slice(start, start + MAX_QUOTE).trim() + (start + MAX_QUOTE < text.length ? " …" : "");
}

// Long paragraphs: keep the sentences that match, and the one after each.
// A first matching sentence longer than the limit (a list without full stops,
// seen on real terms of use) is cut around its keyword, never dropped.
export function shorten(text) {
  if (text.length <= MAX_QUOTE) return text;
  const sentences = text.split(/(?<=[.;!?])\s+/);
  const keep = new Set();
  sentences.forEach((s, i) => { if (matches(s).length) { keep.add(i); keep.add(i + 1); } });
  let out = "";
  let last = -2;
  for (const i of [...keep].sort((a, b) => a - b)) {
    if (i >= sentences.length) continue;
    const piece = (i === last + 1 ? " " : out ? " … " : "") + sentences[i];
    if ((out + piece).length > MAX_QUOTE) {
      out = out ? out + " …" : windowAround(sentences[i]);
      break;
    }
    out += piece;
    last = i;
  }
  return out || windowAround(text);
}

export function extract(pages) {
  const seen = new Set();
  const clauses = [];
  for (const page of pages.filter((p) => p.read)) {
    for (const { heading, text } of paragraphs(page.body, page.html)) {
      if (text.length < MIN_LENGTH) continue;
      const categories = matches(text);
      if (!categories.length) continue;
      const quote = shorten(text);
      const id = clauseId(quote);
      if (seen.has(id)) continue;
      seen.add(id);
      clauses.push({ id, page: page.url, heading, categories, quote });
    }
  }
  // Clauses about scraping and robots first, then the others; page order otherwise.
  const weight = (c) => (c.categories.includes("scraping") || c.categories.includes("robots") ? 2 : 0) + (c.categories.includes("mining") || c.categories.includes("extraction") ? 1 : 0);
  const sorted = clauses.map((c, i) => ({ c, i })).sort((a, b) => weight(b.c) - weight(a.c) || a.i - b.i).map((x) => x.c);
  return { clauses: sorted.slice(0, MAX_CLAUSES), total: clauses.length, truncated: clauses.length > MAX_CLAUSES };
}

await standalone(import.meta.url, async (ctx) => {
  const terms = await findTerms(ctx);
  return { terms_pages: terms.pages.map(({ body, ...p }) => p), ...extract(terms.pages) };
});
