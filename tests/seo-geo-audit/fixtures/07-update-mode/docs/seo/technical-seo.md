# Technical SEO — Brewline

- **Audit date:** 2026-09-15
- **Scope:** local code and live site `http://localhost:8707`
- **Facts checked against sources on:** 2026-09-15
- **Legend:** [x] in place and verified, with proof in italics · [ ] to do · *(unverified)* could not be checked

## 1. Structured data contradicts the page — impact H · effort S

**Finding:** the JSON-LD says $99, 4.9 stars from 2,310 reviews, a lifetime warranty and Turkish-coffee grinding; the page says $149, no reviews, two-year warranty, not fine enough for Turkish coffee. — *proof: `public/grinder/index.html`, `public/index.html`*

**Code**
- [ ] Set `offers.price` to `149.00` (`public/grinder/index.html`)
- [ ] Remove `aggregateRating` and `review` from the Product block (`public/grinder/index.html`)
- [ ] Remove `aggregateRating` from the Organization block (`public/index.html`)
- [ ] Remove the `FAQPage` block (`public/grinder/index.html`) — *note (Sam): the agency says this one is fine, check with them first*

**Manual**
- [ ] Rich Results Test on `/` and `/grinder/` after the change

**Done when:** the only price in the JSON-LD is `149.00`; no `aggregateRating`, `review` or `FAQPage` on either page.

## 2. Search Console and Bing Webmaster Tools — impact M · effort S

**Manual**
- [ ] Search Console: verify the site, submit `sitemap.xml`
- [x] Bing Webmaster Tools: site verified, sitemap submitted — *Sam, 2026-09-20*

**Done when:** both consoles show the sitemap as read.

## 3. Open Graph completeness — impact L · effort S

**Code**
- [ ] Add `og:description` and `og:url` to both pages

**Done when:** `check-live.mjs` shows all five `og:` values on `/` and `/grinder/`.

## Already in place

- [x] Pages answer 200, real 404 — *proof: check-live.mjs, 2026-09-15*
- [x] No `noindex` on public pages — *proof: check-live.mjs, 2026-09-15*
- [x] Self-referencing canonicals — *proof: check-live.mjs, 2026-09-15*
