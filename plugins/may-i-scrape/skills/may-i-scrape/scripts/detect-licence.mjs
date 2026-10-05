#!/usr/bin/env node
// Open licences declared on the page, split by what they cover:
//   - "data": Licence Ouverte / Etalab and ODbL (data licences by nature), or
//     any licence attached to a schema.org Dataset in JSON-LD;
//   - "site": the other licences (rel="license", footer mentions, JSON-LD on
//     other types), which cover the site's content, not necessarily its data.
// Also flags "all rights reserved" mentions. Each licence carries the
// conditions that matter for the purpose: nc (non-commercial), nd (no
// derivatives), sa (share-alike).
//
// Usage: node detect-licence.mjs <URL> [--agent token]
// Node 18+, no dependencies.

import { standalone } from "./lib/context.mjs";
import { anchors, links, jsonldNodes, types, footerText } from "./lib/page.mjs";

const DATA_TYPES = new Set(["Dataset", "DataCatalog", "DataDownload"]);

// Licence from a URL or a name; null when not an open licence we know.
export function identify(ref) {
  const s = String(ref ?? "").toLowerCase();
  const cc = s.match(/creativecommons\.org\/licenses\/([a-z-]+)\/(\d\.\d)/);
  if (cc) {
    const parts = cc[1].split("-");
    return { id: `CC-${cc[1].toUpperCase()}-${cc[2]}`, nc: parts.includes("nc"), nd: parts.includes("nd"), sa: parts.includes("sa") };
  }
  if (/creativecommons\.org\/publicdomain\/zero|\bcc0\b/.test(s)) return { id: "CC0-1.0", nc: false, nd: false, sa: false };
  const ccText = s.match(/\bcc[ -]by((?:[ -](?:nc|nd|sa))*)\b/);
  if (ccText) {
    const parts = ccText[1].trim().split(/[ -]/).filter(Boolean);
    return { id: `CC-BY${parts.length ? "-" + parts.join("-").toUpperCase() : ""}`, nc: parts.includes("nc"), nd: parts.includes("nd"), sa: parts.includes("sa") };
  }
  // "Open licence" alone is too common a phrase: require the French name or Etalab.
  if (/licence[ -]ouverte|etalab/.test(s)) return { id: "Licence-Ouverte", nc: false, nd: false, sa: false, data: true };
  if (/\bodbl\b|open database licen[cs]e|opendatacommons\.org\/licenses\/odbl/.test(s)) return { id: "ODbL", nc: false, nd: false, sa: true, data: true };
  return null;
}

export async function detectLicence(ctx) {
  const html = await ctx.html();
  if (!html) return { read: false, site: [], data: [], all_rights_reserved: false };
  const analysis = await ctx.analysis();
  const found = new Map();   // "scope|id" -> licence
  const add = (lic, scope, evidence) => {
    if (!lic) return;
    const s = lic.data ? "data" : scope;
    const key = `${s}|${lic.id}`;
    if (!found.has(key)) found.set(key, { id: lic.id, nc: lic.nc, nd: lic.nd, sa: lic.sa, scope: s, evidence });
  };

  for (const a of anchors(html)) if (a.rel.split(/\s+/).includes("license")) add(identify(a.href) ?? identify(a.text), "site", `<a rel="license" href="${a.href}">`);
  for (const l of links(html)) if ((l.rel ?? "").toLowerCase().split(/\s+/).includes("license")) add(identify(l.href), "site", `<link rel="license" href="${l.href}">`);
  for (const n of jsonldNodes(analysis)) {
    if (!n.license) continue;
    const ref = typeof n.license === "object" ? n.license.url ?? n.license["@id"] ?? n.license.name : n.license;
    const scope = types(n).some((t) => DATA_TYPES.has(t)) ? "data" : "site";
    add(identify(ref), scope, `JSON-LD ${types(n).join("/") || "node"} license: ${ref}`);
  }
  // Licence links anywhere (often in the footer), then plain-text mentions.
  for (const a of anchors(html)) add(identify(a.href), "site", `link to ${a.href}`);
  const footer = footerText(html);
  for (const m of footer.matchAll(/licence ouverte|\bodbl\b|open database licen[cs]e|\bcc[ -]by(?:[ -](?:nc|nd|sa))*\b|\bcc0\b/gi)) add(identify(m[0]), "site", `footer mentions "${m[0]}"`);

  const all = [...found.values()];
  return {
    read: true,
    site: all.filter((l) => l.scope === "site"),
    data: all.filter((l) => l.scope === "data"),
    all_rights_reserved: /tous droits réservés|all rights reserved/i.test(footer),
  };
}

await standalone(import.meta.url, detectLicence);
