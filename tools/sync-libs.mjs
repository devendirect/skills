#!/usr/bin/env node
// Keeps the code shared between plugins identical. An installed plugin cannot
// read another plugin's files, so each one carries its own copy; seo-geo-audit
// is the source.
//
// Usage:
//   node tools/sync-libs.mjs           copy the source files over the copies
//   node tools/sync-libs.mjs --check   exit 1 if a copy differs (CI)
// Node 18+, no dependencies.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SOURCE = "plugins/seo-geo-audit/skills/seo-geo-audit/scripts";
const FILES = ["lib/robots.mjs", "lib/html.mjs", "ai-crawlers.json"];
const COPIES = ["plugins/may-i-scrape/skills/may-i-scrape/scripts"];

const check = process.argv.includes("--check");
let differ = 0;

for (const file of FILES) {
  const src = await readFile(join(root, SOURCE, file), "utf8");
  for (const dir of COPIES) {
    const dest = join(root, dir, file);
    const current = await readFile(dest, "utf8").catch(() => null);
    if (current === src) continue;
    if (check) {
      differ++;
      console.log(`differs: ${dir}/${file} (source: ${SOURCE}/${file})`);
    } else {
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, src);
      console.log(`copied: ${SOURCE}/${file} -> ${dir}/${file}`);
    }
  }
}

if (check) {
  console.log(differ ? `${differ} file(s) out of sync: run node tools/sync-libs.mjs` : "shared files in sync");
  process.exit(differ ? 1 : 0);
}
