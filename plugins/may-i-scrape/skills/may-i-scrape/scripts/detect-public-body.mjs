#!/usr/bin/env node
// Is the site run by a French public body? Only the hostname is used, no
// request is sent. Today: gouv.fr and its subdomains. Local authorities
// (communes, départements, régions) use ordinary domains and need a list,
// still to be built.
//
// A public body only gives a presumption that published documents can be
// reused (CRPA, art. L.321-1 and following: to verify), never for personal
// data or third-party rights.
//
// Usage: node detect-public-body.mjs <URL>
// Node 18+, no dependencies.

import { standalone } from "./lib/context.mjs";

const SUFFIXES = [{ suffix: "gouv.fr", body: "French State (gouv.fr)" }];

export function detectPublicBody(ctx) {
  const host = ctx.url.hostname.toLowerCase().replace(/\.$/, "");
  const hit = SUFFIXES.find((s) => host === s.suffix || host.endsWith("." + s.suffix));
  return hit
    ? { public: true, host, rule: hit.suffix, body: hit.body, note: "Presumption of free reuse of published public documents (CRPA, to verify), except personal data and third-party rights." }
    : { public: false, host, rule: null, note: "Not a gouv.fr host. Local authorities are not detected yet." };
}

await standalone(import.meta.url, async (ctx) => detectPublicBody(ctx));
