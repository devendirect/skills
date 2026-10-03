#!/usr/bin/env node
// Serve a fixture as if it were deployed.
//
// Usage: node serve.mjs <fixture name>      e.g. node serve.mjs 01-healthy
//
// Each fixture's fixture.json sets: port, root (folder served), and optionally
// spaFallback (unknown paths answer 200 with index.html), redirects
// ({ "/path": [code, "/target"] }) and headers ({ "/path": { name: value } }).
// Node 18+, no dependencies.

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

export async function loadFixture(name) {
  const dir = join(here, "fixtures", name);
  const config = JSON.parse(await readFile(join(dir, "fixture.json"), "utf8"));
  return { dir, config };
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

export async function start(name) {
  const { dir, config } = await loadFixture(name);
  if (!config.port) throw new Error(`${name} is not servable (no port in fixture.json)`);
  const root = join(dir, config.root);

  const server = http.createServer(async (req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    const extra = config.headers?.[path] ?? {};

    const redirect = config.redirects?.[path];
    if (redirect) {
      res.writeHead(redirect[0], { location: redirect[1], ...extra });
      return res.end();
    }

    let file = await fileFor(root, path);
    let status = 200;
    if (!file && config.spaFallback) file = await fileFor(root, "/index.html");
    if (!file) {
      status = 404;
      file = await fileFor(root, "/404.html");
    }
    const type = file ? TYPES[extname(file)] ?? "application/octet-stream" : "text/plain; charset=utf-8";
    const body = file ? await readFile(file) : "Not found";
    res.writeHead(status, { "content-type": type, ...extra });
    res.end(req.method === "HEAD" ? undefined : body);
  });

  await new Promise((resolve, reject) => server.once("error", reject).listen(config.port, resolve));
  return { server, url: `http://localhost:${config.port}` };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  const name = process.argv[2];
  if (!name) {
    console.error("usage: node serve.mjs <fixture name>");
    process.exit(2);
  }
  const { url } = await start(name);
  console.log(`${name} served at ${url}  (Ctrl+C to stop)`);
}
