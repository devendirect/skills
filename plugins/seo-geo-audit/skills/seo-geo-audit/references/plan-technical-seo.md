# Plan: technical SEO

Always written. Order the blocks by what the audit found: a blocking problem (noindex in production, empty HTML, broken redirects) goes first, whatever its theme.

## 1. Indexability (blocking issues first)

- No accidental `noindex` (meta robots or `X-Robots-Tag` header) on pages that should rank; no leftover staging setting (WordPress "Discourage search engines").
- robots.txt does not block pages, CSS or JS needed to render. AI crawler rules: see [`ai-crawlers.md`](ai-crawlers.md).
- Key content present in the **served HTML** (`curl -sL`), not only after JavaScript runs.
- Real status codes: 200 for pages, a real 404 (not a 200 "not found" page, a soft 404), no redirect chains or loops.
- **Redirect type matches intent**: 301 / 308 for a permanent move, 302 / 307 only when it is really temporary. A permanent setup served with a 302 (root → default language, old URL → new URL, HTTP → HTTPS) is a finding, even if the target is right.
- One host: HTTP → HTTPS and www / non-www redirect to a single version.

## 2. Canonicals and duplicates

- Every indexable page has a self-referencing absolute canonical.
- Parameters, trailing slashes, uppercase, sorting and pagination do not create duplicate indexable URLs.
- noindex pages are not canonical targets and are not in the sitemap.

## 3. Sitemap

- Exists, declared in robots.txt, only indexable 200 canonical URLs.
- `lastmod` reflects real content changes (not the build date on every URL).
- Split above 50,000 URLs or 50 MB.

## 4. Titles, descriptions, Open Graph

- Unique, specific `<title>` per page; meta descriptions written for the click, not keyword lists.
- One clear `<h1>` per page, logical heading order.
- Open Graph (`og:title`, `og:description`, `og:image`, `og:url`) and an image that renders well when shared.

## 5. International (only if several languages or countries)

- `hreflang` on every version, reciprocal, self-referencing, plus `x-default`.
- `<html lang>` set correctly on **each** version (check them all: a copied template often keeps the first language).
- **The root URL (`/`)**: check what it does with `curl -sI`. Common problems:
  - a 302 to one language for everyone: temporary for a permanent setup, and every visitor lands on that language whatever they speak. Either serve a language-neutral page at `/` (a short chooser, declared as `x-default`), or make it a 301 to the default version and point `x-default` at it;
  - a redirect based on the browser language (`Accept-Language`) or IP: crawlers mostly come without a language and from one country, so they only ever see one version. Do not recommend it; suggest a visible language switcher instead.
  A redirect that ignores the browser language is not a finding in itself; check its status code and its target.

## 6. Internal linking

- Every indexable page reachable through normal `<a href>` links (not only via JS events or the sitemap).
- No orphan pages; important pages close to the home page.
- Descriptive anchor text.

## 7. Performance (Core Web Vitals)

Thresholds for "good": **LCP < 2.5 s, INP < 200 ms, CLS < 0.1** *(verify)*. Use field data (PageSpeed Insights, Search Console) when the site has traffic; lab data only points to causes.

Usual levers: image sizes and formats, `width` / `height` on media, font loading, third-party scripts, long JavaScript tasks.

## 8. Manual actions (consoles)

- Google Search Console: property, sitemap submitted, coverage and Core Web Vitals reports.
- Bing Webmaster Tools: see [`plan-ai-visibility.md`](plan-ai-visibility.md).
