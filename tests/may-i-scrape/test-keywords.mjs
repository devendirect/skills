#!/usr/bin/env node
// Unit tests of scripts/keywords.json and extract-clauses.mjs: which
// paragraphs of terms of use are kept, and which are not. Each false
// positive found on a real site gets a case here.
//
// Usage: node test-keywords.mjs
// Node 18+, no dependencies.

import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const { linkScore } = await import(pathToFileURL(join(here, "..", "..", "plugins", "may-i-scrape", "skills", "may-i-scrape", "scripts", "find-terms.mjs")).href);
const { charsetOf } = await import(pathToFileURL(join(here, "..", "..", "plugins", "may-i-scrape", "skills", "may-i-scrape", "scripts", "lib", "http.mjs")).href);
const { extract, clauseId } = await import(pathToFileURL(join(here, "..", "..", "plugins", "may-i-scrape", "skills", "may-i-scrape", "scripts", "extract-clauses.mjs")).href);

const kept = (text) => extract([{ url: "x", read: true, html: false, body: text }]).clauses.length === 1;

const KEEP = [
  "Toute extraction automatisée du contenu du site, notamment par des robots, est interdite.",
  "L'aspiration du site au moyen de logiciels est strictement prohibée par l'éditeur.",
  "You may not use any robot, spider, scraper or other automated means to access the Service.",
  "La fouille de textes et de données du contenu de ce site est expressément réservée par l'éditeur.",
  "Le contenu ne peut pas être utilisé pour l'entraînement de modèles d'intelligence artificielle.",
  "You may not use the content for training of AI models or machine learning purposes.",
  "Toute reproduction totale ou partielle sans autorisation expresse est interdite.",
  "Il est interdit d'extraire une partie substantielle de la base de données du site.",
  "Users may not run scripts that systematically download listings from the website.",
];
const DROP = [
  // Found on a real site (2026-10-04): "inscription" contains "script".
  "Lors de l'inscription au Service, l'usager choisit un identifiant et un mot de passe valide.",
  // "entraîner" also means "to lead to".
  "Le non-respect des présentes conditions peut entraîner la suspension immédiate du compte de l'usager.",
  "Les cookies de mesure d'audience peuvent être refusés depuis le bandeau prévu à cet effet.",
  "Les délais de livraison sont indiqués à titre indicatif lors de la validation de la commande.",
  "Court", // under the minimum length
  // Found on real sites (2026-10-04): "automatique / automatically" in payment and update clauses.
  "Le Client paye son abonnement tous les mois par prélèvement automatique et peut le résilier à tout moment.",
  "Doing this once will not mean we automatically waive the right on any other occasion.",
  "Vous acceptez que les mises à jour puissent être effectuées automatiquement, sans aucune action de votre part.",
];

let failed = 0;
for (const t of KEEP) if (!kept(t)) { failed++; console.log(`FAIL not kept: ${t}`); } else console.log(`ok   kept: ${t.slice(0, 70)}`);
for (const t of DROP) if (kept(t)) { failed++; console.log(`FAIL kept: ${t}`); } else console.log(`ok   dropped: ${t.slice(0, 70)}`);

// Links to the terms of use: whole link text or whole path segment only.
// Every false positive below was met on a real site (phase 3, 2026-10-04).
const LINKS = [
  ["Conditions générales d'utilisation", "/p/x", 3],
  ["Modalités d'utilisation", "/pages/legal/cgu", 3],
  ["CGU & CGV", "/pages/cgu-cgv.html", 3],
  ["Terms", "/site-policy/github-terms/github-terms-of-service", 3],
  ["Terms and conditions", "/help/terms-conditions", 2],
  ["Conditions générales de vente", "/gp/help/customer/display.html", 2],
  ["Legal", "/legal/", 1],
  ["Mentions légales", "/mentions-legales", 1],
  ["Palantir More than 44,000 file legal objections", "/technology/2026/sep/30/legal-objections-palantir-nhs", 0],
  ["451 Unavailable For Legal Reasons", "/en-US/docs/Web/HTTP/Reference/Status/451", 0],
  ["DC Terms", "/hal-01350098v1/dcterms", 0],
  ["Glossary of Terms", "/help", 0],
  ["legal form", "/wiki/Property:P1454", 0],
  ["Report an IT vulnerability", "/legal-notice/vulnerability-disclosure-policy_en", 1],
  ["Mentions légales et crédits", "/fr/information/2008466", 1],
  ["Legal and privacy", "/about", 0],
  ["Legal objections to the plan", "/news/2026/legal-objections", 0],
];
for (const [text, path, want] of LINKS) {
  const got = linkScore(text, path);
  if (got !== want) { failed++; console.log(`FAIL link "${text}" ${path}: score ${got}, expected ${want}`); } else console.log(`ok   link "${text}" -> ${want}`);
}

// Charset: header first, then <meta charset>, else UTF-8.
const CHARSETS = [
  ["text/html; charset=ISO-8859-1", "", "iso-8859-1"],
  ["text/html", '<meta charset="windows-1252">', "windows-1252"],
  ["text/html", '<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">', "iso-8859-1"],
  ["text/html", "", "utf-8"],
  ["text/html; charset=bogus-charset", "", "utf-8"],
];
for (const [ct, head, want] of CHARSETS) {
  const got = charsetOf(ct, head);
  if (got !== want) { failed++; console.log(`FAIL charset ${ct} ${head}: ${got}, expected ${want}`); } else console.log(`ok   charset -> ${want}`);
}

// A long list item without full stops: the quote must keep the keyword,
// never collapse to " …" (seen on real terms of use).
{
  const item = "Vous vous engagez à ne pas " + "utiliser la Plateforme de manière abusive, ".repeat(12) + "ni utiliser de robots, scrapers ou tout autre moyen automatisé pour extraire des données de la Plateforme, " + "ni porter atteinte au service, ".repeat(10);
  const [c] = extract([{ url: "x", read: true, html: false, body: item }]).clauses;
  const ok = c && c.quote.length <= 704 && /scrapers/.test(c.quote) && c.quote.trim() !== "…";
  if (!ok) { failed++; console.log(`FAIL long list item quote: "${c?.quote}"`); } else console.log("ok   long list item keeps its keyword");
}

// Ids are stable and ignore case and spacing.
const same = clauseId("Toute  extraction est INTERDITE.") === clauseId("toute extraction est interdite.");
if (!same) { failed++; console.log("FAIL clause ids depend on case or spacing"); } else console.log("ok   stable clause ids");

console.log(`\n${KEEP.length + DROP.length + LINKS.length + CHARSETS.length + 2 - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
