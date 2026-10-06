# Changelog — seo-geo-audit

## 2.7.2 — 2026-10-06

### Changed

- Description: the list of French trigger phrases is replaced by "in any language" (689 → 595 characters, loaded in every session). Measured before the change: the 5 French should-trigger test queries triggered the skill 10/10 with both descriptions, and 10 near-miss queries never triggered it.

## 2.7.1 — 2026-10-04

From a `/claude-api prompt-audit` of the skill (target model: Claude Opus 5.5).

### Fixed

- `ai-mentions.mjs`: an answer cut off at `max_tokens` was counted as "answered, site not cited". It is now reported as an error, and `max_tokens` is raised from 8,000 to 16,000 (thinking is always on and counts toward it).
- `SKILL.md`: the plans table said "Always" for three plans while the scope options narrow them; plans are now written only when the scope includes them.
- `SKILL.md`: block ordering is defined once, in `references/output-format.md` (impact first, then effort), instead of a second, different wording.
- `SKILL.md`: "Absolute rules" heading renamed "Rules".

### Added

- `ai-mentions.mjs` reports what a run consumed, per engine: input and output tokens, web searches (summed over `pause_turn` continuations). Tests cover both changes.

## 2.7.0 — 2026-10-03

### Added

- **Politeness rules** (`references/politeness.md`, rule 9 in `SKILL.md`): own site with permission, competitors read-only (3 sites, 1 page each, robots.txt respected), keys never written, paid calls counted and confirmed.
- **Competitor comparison** (`compare` scope, `scripts/compare.mjs`): one of the user's pages against up to 3 competitor pages; served words, h1, title / description lengths, `og:image`, hreflang, top-level JSON-LD types, and which AI agents each robots.txt blocks.
- **Real search data** (`search-data` scope, `scripts/search-data.mjs`, `references/search-data.md`): Search Console CSV exports (any interface language), the Search Console API (service-account JWT or token), URL Inspection, the Bing Webmaster API. Lists top queries, queries ranked 4–20 with many impressions, and queries seen but never clicked.
- **AI assistant check** (`ai-check` scope, `scripts/ai-mentions.mjs`, `references/ai-mentions.md`): asks Claude, OpenAI and Perplexity the target questions with web search and records citations, sources read, refusals and errors. Prints the plan and sends nothing without `--yes`.
- `scripts/lib/robots.mjs`: robots.txt parsing shared by `robots-check.mjs` and `compare.mjs`.
- `tests/seo-geo-audit/test-apis.mjs`: API modes tested against local mocks (signed JWT verified); fixture 09 (Search Console exports EN / FR); run in CI.

## 2.6.0 — 2026-10-03

### Added

- **Update mode** (`references/update-mode.md`): re-checks existing plans, ticks what is done with proof, flags regressions on ticked items, adds new findings as new blocks, keeps the user's notes and decisions, adds "Changes since the last audit" to the summary.
- **Scope arguments**: `technical`, `ai`, `analytics`, `indexnow`, `programmatic`, `update`, `--url <url>`, `--no-live`, combinable, with natural-language equivalents.
- `scripts/render-compare.mjs`: raw HTML against the DOM rendered by a headless Chrome / Edge (title, description, robots, canonical, h1, words, links, JSON-LD). Exit code 3 when no browser is found.
- `scripts/log-bots.mjs` and `references/server-logs.md`: crawler visits per agent and visitors sent by AI assistants, from Apache / Nginx combined logs (plain or `.gz`), aggregated, no IPs.
- Optional modules: `module-local.md` (LocalBusiness, NAP, Business Profile), `module-ecommerce.md` (merchant listings vs product snippets, Merchant Center, faceted navigation, stock), `module-media.md` (images, VideoObject). Facts checked against Google's documentation on this date.
- `scripts/lib/html.mjs`: HTML extraction shared by `check-live.mjs` and `render-compare.mjs`.
- `ai-crawlers.json`: `robotsOnly` flag for tokens that never appear in logs (`Google-Extended`, `Applebot-Extended`).
- Test fixtures 07 (update mode) and 08 (server logs); `tests/seo-geo-audit/check-sources.mjs` and a monthly CI check of the sources.

### Fixed

- Seven source URLs had moved (Google crawler docs, Bing guidelines, Perplexity, Meta, CNIL); `sources.md` updated.
- Script user agents no longer carry a version number that went stale.

## 2.5.0 — 2026-10-03

### Added

- Packaged as a Claude Code plugin (`plugins/seo-geo-audit/`, `.claude-plugin/plugin.json`) in the repo's marketplace (`.claude-plugin/marketplace.json`). Both manifests pass `claude plugin validate --strict`; install tested in an isolated config.
- Installable with `npx skills add` as well.

### Fixed

- The `description` in the SKILL.md frontmatter was not valid YAML (unquoted `: ` inside the text). Claude Code tolerated it, but strict parsers such as the `skills` CLI rejected the skill. It is now a quoted string.

## 2.4.0 — 2026-10-03

From the first full run on the six test projects (5 pass, 1 partial).

### Fixed

- `[x]` was used for observed problems ("GA4 loads before consent [x]"), which reads as "done". It now only means "in place and verified"; problems go in a **Finding** line per block, their fixes in unticked actions.
- The summary file was sometimes translated (`00-synthese.md`). It is now always `00-summary.md`, whatever the language, so later runs find it.
- A site-wide 302 from `/` to the French version was ticked as fine because it ignored the browser language. The technical plan now checks the redirect type (301/308 vs 302/307) and what the root URL does on multilingual sites.

### Added

- `check-live.mjs` flags every temporary redirect (302 / 307) on the way to the page.
- `tests/seo-geo-audit/run-skill-evals.sh`: runs the full skill headless on fixture copies, one after the other, PowerShell allowed, stops cleanly on a usage limit.

## 2.3.0 — 2026-10-03

### Added

- Test projects in `tests/seo-geo-audit/` (repo root, not shipped with the skill): six fixtures, each built around one trap, with automatic script tests (`run-script-tests.mjs`) and a checklist for the full audit (`expected.md`).
- `check-live.mjs`: flags a sitemap URL that answers 200 with something that is not a sitemap (typical SPA fallback), and a sitemap with no URL.

### Fixed

- `references/stacks.md`: Next.js client components are pre-rendered on the server too. The real issue with a `"use client"` page is that it cannot export `metadata` / `generateMetadata`, not hidden content.

## 2.2.0 — 2026-10-03

### Added

- `scripts/check-live.mjs`: live checks from the raw served HTML. Redirect chain, status, headers, title / description / robots / canonical / hreflang / h1 / Open Graph, served word count and empty-app-root detection, every JSON-LD block parsed, host variants, robots.txt, sitemap (index aware, flags identical lastmod everywhere), llms.txt (flags HTML error pages served as 200), soft-404 test. Ends with a Findings list.
- `scripts/robots-check.mjs`: robots.txt against the AI crawler list, following RFC 9309 (group by exact token, else `*`; longest rule wins, Allow wins ties; `*` and `$`). Flags deprecated tokens and search agents blocked by accident, grouped per rule. Works on a URL or a local file.
- `scripts/ai-crawlers.json`: the crawler list used by `robots-check.mjs`, kept in sync with `references/ai-crawlers.md`.
- Phase 2 now runs the scripts first, then interprets their findings; `curl` stays as the fallback.

## 2.1.0 — 2026-10-03

### Added

- French trigger phrases in the description (« audit SEO », « référencement », « visibilité IA »…).
- A fixed output format (`references/output-format.md`): plan header, impact H/M/L × effort S/M/L ratings, "Done when" check per block, user decisions as their own blocks.
- `00-summary.md`, written at the end of every audit: top 5 actions, decisions for the user, what is already in place, what could not be verified.

## 2.0.0 — 2026-10-03

Rewrite of the original French single-file skill. Facts re-checked against official sources on this date.

### Fixed

- **Google-Extended** was described as blockable "without visibility loss". It also controls Gemini grounding: blocking it removes the site from answers built from the Search index. It still has no effect on Google Search or AI Overviews.
- **FAQPage**: no longer suggested for rich results. Since 2023-09-14 they are limited to authoritative government and health sites.
- **Consent outside the EU**: "nothing required" was wrong. Added the UK, Switzerland, California, Québec and Brazil, with a rule to check the target country's regime at the source.
- **IndexNow key**: allowed characters are `a-zA-Z0-9-`, not hexadecimal only. Participant list updated (Yep, Internet Archive, Amazon added).
- **AI crawlers**: added Perplexity-User, Meta, Amazon, Mistral, DuckAssistBot; flagged deprecated Anthropic tokens; noted which user-triggered agents ignore robots.txt.

### Added

- A **technical SEO** plan (indexability, canonicals, sitemap, titles and Open Graph, hreflang, internal linking, Core Web Vitals). The description promised it, no plan covered it.
- Live checks with **`curl`** instead of a web-fetch tool, which can drop JSON-LD, headers and status codes.
- Stack guide: Next.js, Nuxt, Astro, SvelteKit, SPA, plain PHP, WordPress, Laravel, static HTML.
- A path for **non-deployed** projects.
- **Consent Mode**, and the CNIL exemption conditions (exempt by configuration, not by brand).
- Official sources list, and a last-checked date.
- Rule: if there is nothing to fix, say so instead of inventing problems.

### Changed

- llms.txt moved from first to last AI-visibility lever, labeled speculative (no major engine has documented using it).
- Google autocomplete labeled as an undocumented endpoint, not an official API.
- The skill is now written in English; the plans it produces are still in the audited project's language.
- Theme details moved to `references/`, keeping `SKILL.md` short.
