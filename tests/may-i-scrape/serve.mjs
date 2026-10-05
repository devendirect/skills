#!/usr/bin/env node
// Serves a fixture as if it were a deployed site.
//
// Usage: node serve.mjs <fixture name> [port]     e.g. node serve.mjs 01-nothing 8601
//
// fixture.json: { "host": "https://fake.example",   the URL the tests pretend to visit
//                 "root": "site",                   folder served
//                 "routes": { "/path": { "status": 403, "headers": {…}, "file": "x.html" } } }
// Node 18+, no dependencies.

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const TYPES = { ".html": "text/html; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".json": "application/json; charset=utf-8", ".xml": "application/xml; charset=utf-8" };

export async function loadFixture(name) {
  const dir = join(here, "fixtures", name);
  return { dir, config: JSON.parse(await readFile(join(dir, "fixture.json"), "utf8")) };
}

async function fileFor(root, urlPath) {
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, "");
  if (clean.startsWith("..")) return null;
  let p = join(root, clean);
  try {
    if ((await stat(p)).isDirectory()) p = join(p, "index.html");
    await stat(p);
    return p;
  } catch {
    return null;
  }
}

export async function start(name, port = 0) {
  const { dir, config } = await loadFixture(name);
  const root = join(dir, config.root ?? "site");
  const seen = [];   // paths requested, to check what the skill did not read
  const server = http.createServer(async (req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    seen.push(path);
    const route = config.routes?.[path] ?? {};
    const file = route.file ? join(root, route.file) : await fileFor(root, path);
    const status = route.status ?? (file ? 200 : 404);
    const body = file ? await readFile(file) : "Not found";
    res.writeHead(status, { "content-type": (file && TYPES[extname(file)]) ?? "text/plain; charset=utf-8", ...(route.headers ?? {}) });
    res.end(body);
  });
  await new Promise((ok, ko) => server.once("error", ko).listen(port, "127.0.0.1", ok));
  return { server, config, seen, url: `http://127.0.0.1:${server.address().port}` };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const name = process.argv[2];
  if (!name) { console.error("usage: node serve.mjs <fixture name> [port]"); process.exit(2); }
  const { url, config } = await start(name, Number(process.argv[3] ?? 0));
  console.log(`${name} (${config.host}) served at ${url}  (Ctrl+C to stop)`);
}
