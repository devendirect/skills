# SEO / GEO audit — Brewline

- **Audit date:** 2026-09-15
- **Scope:** local code (`public/`) and the live site at `http://localhost:8707`
- **Overall:** clean pages, but the structured data contradicts the page on price, reviews and warranty. Remove the false claims first.

## Top 5 actions

| # | Action | Plan | Impact | Effort |
| --- | --- | --- | --- | --- |
| 1 | Make the JSON-LD match the page (price, reviews, FAQ) | [Technical SEO](technical-seo.md#1-structured-data-contradicts-the-page--impact-h--effort-s) | H | S |
| 2 | Register in Search Console and Bing Webmaster Tools | [Technical SEO](technical-seo.md#2-search-console-and-bing-webmaster-tools--impact-m--effort-s) | M | S |
| 3 | Add a visible, truthful FAQ on `/grinder/` | [AI visibility](ai-visibility.md#1-a-visible-truthful-faq--impact-m--effort-s) | M | S |
| 4 | Add `og:description` and `og:url` | [Technical SEO](technical-seo.md#3-open-graph-completeness--impact-l--effort-s) | L | S |

## Decisions for you

- **Reviews:** none for now / collect real reviews shown on the page. Recommendation: none now, real reviews later.
  > Decision (Sam, 2026-09-18): no reviews until we have at least 20 real ones. Don't bring it up again before December.

## Already in place

- 200 status, no redirect chains, no `noindex`, real 404
- Self-referencing canonicals; unique titles and descriptions

## Not verified

- Search Console and Bing: no console access

## Plans

- [Technical SEO](technical-seo.md) — 3 blocks, 1 high impact
- [AI visibility](ai-visibility.md) — 1 block
