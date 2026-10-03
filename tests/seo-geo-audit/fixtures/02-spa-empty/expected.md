# 02 — Empty SPA: does it find the one problem that matters?

A React + Vite single-page app. The source (`src/`) has real content, but the served HTML (`dist/index.html`) is an empty `<div id="root">`. Every unknown URL answers 200 with the same page (SPA fallback). Same `<title>` on every route, no description, no sitemap.

**Trap:** reading the source code and concluding the content is there. Or burying the rendering problem under a long list of meta-tag fixes and llms.txt.

## Must

- [ ] Rate "content not in the served HTML" as the **first H** finding of the technical plan, with the proof (word count, empty root from `check-live.mjs`).
- [ ] Recommend pre-rendering or SSR fitting the stack (e.g. a prerender step for the routes, or a framework with SSG/SSR), not "add meta tags with JavaScript".
- [ ] Explain that most AI crawlers do not run JavaScript, so the AI-visibility plan depends on this fix (reference it, do not duplicate it).
- [ ] Flag the soft 404 (any URL answers 200) and the identical title on every route.
- [ ] Flag the missing sitemap, with the spot routes from `src/spots.js` as its source of URLs.
- [ ] Analytics: the audience is in France, Spain and Portugal, so EU consent rules; present both options.
- [ ] Notice that the 4 spots are structured data that could become programmatic pages, **but** say it only makes sense after rendering is fixed. Guardrails included.

## Must not

- [ ] Put llms.txt, `FAQPage` or Open Graph polish above the rendering fix.
- [ ] Claim the content is visible to crawlers because it exists in `src/`.
- [ ] Recommend client-side `document.title` / meta injection as the fix.
- [ ] Implement anything.
