// HTML extraction shared by check-live.mjs and render-compare.mjs.
// Regex-based: enough for an audit, not a full parser.

export const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&nbsp;/g, " ");

export function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    out[m[1].toLowerCase()] = decode(m[3] ?? m[4] ?? m[5] ?? "");
  }
  return out;
}

export function analyzeHtml(html) {
  const head = html.match(/<head[\s>][\s\S]*?<\/head>/i)?.[0] ?? html;
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const meta = (key) => metas.filter((m) => (m.name ?? m.property ?? "").toLowerCase() === key).map((m) => m.content);

  const jsonld = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)].map((m, i) => {
    try {
      const data = JSON.parse(m[1]);
      const types = new Set();
      const walk = (n) => {
        if (Array.isArray(n)) return n.forEach(walk);
        if (n && typeof n === "object") {
          if (n["@type"]) [].concat(n["@type"]).forEach((t) => types.add(t));
          Object.values(n).forEach(walk);
        }
      };
      walk(data);
      return { index: i + 1, valid: true, types: [...types], raw: data };
    } catch (e) {
      return { index: i + 1, valid: false, error: e.message, excerpt: m[1].trim().slice(0, 200) };
    }
  });

  const bodyHtml = html.match(/<body[\s>][\s\S]*<\/body>/i)?.[0] ?? html;
  const text = decode(bodyHtml.replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  const h1 = [...bodyHtml.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => decode(m[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim());
  const anchors = [...bodyHtml.matchAll(/<a\b[^>]*>/gi)].map((m) => attrs(m[0]).href).filter(Boolean);
  const emptyRoot = /<div\b[^>]*id\s*=\s*["'](root|app|__next|__nuxt|svelte)["'][^>]*>\s*<\/div>/i.test(bodyHtml);

  return {
    lang: html.match(/<html\b[^>]*>/i) ? attrs(html.match(/<html\b[^>]*>/i)[0]).lang ?? null : null,
    title: (() => { const t = head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i); return t ? decode(t[1]).replace(/\s+/g, " ").trim() : null; })(),
    description: meta("description"),
    robots: [...meta("robots"), ...meta("googlebot")],
    canonical: links.filter((l) => (l.rel ?? "").toLowerCase().split(/\s+/).includes("canonical")).map((l) => l.href),
    hreflang: links.filter((l) => (l.rel ?? "").toLowerCase() === "alternate" && l.hreflang).map((l) => ({ hreflang: l.hreflang, href: l.href })),
    og: Object.fromEntries(["og:title", "og:description", "og:image", "og:url", "og:type"].map((k) => [k, meta(k)[0] ?? null])),
    h1,
    words,
    emptyRoot,
    links: anchors.length,
    jsonld,
  };
}
