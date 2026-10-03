---
name: seo-geo-audit
description: "Audits a web project (technical SEO, structured data, visibility in AI assistants / GEO, programmatic SEO, analytics and consent, IndexNow) and writes Markdown action plans with checkboxes, tailored to the project. Use when the user asks for an SEO audit, better visibility in AI chats (llms.txt, GEO, being cited by ChatGPT / Perplexity / Claude / Gemini), programmatic SEO pages, an analytics plan, or IndexNow. Also in French: « audit SEO », « référencement », « visibilité IA », « être cité par ChatGPT / les IA », « GEO », « plan analytics », « mesure d'audience ». This skill WRITES PLANS, it does not implement them; implementation comes afterwards, one block at a time, on request."
---

# SEO / GEO / analytics audit

Goal: deliver Markdown action plans (checkboxes) tailored to the audited project, in the folder the user chooses. Suggest `docs/seo/` by default, check whether it is gitignored, and point out that these notes are often better kept out of the repo.

Facts in this skill and its references were last checked on **2026-10-03**. Search engines, AI crawlers and consent rules change often: anything marked *(verify)* must be re-checked at its source before it goes into a plan.

## Absolute rules

1. **Do not implement anything during this skill.** Plans first; the user then picks which block to build.
2. **`[x]` means "in place and verified"**: file present, HTTP status observed, header read, commit identified. Write the proof in italics next to it. Never tick what you assume, and never tick an observed problem: problems go in the block's **Finding** line, their fixes in unticked actions.
3. **Check search-engine and legal requirements at the source**, not from memory. Official URLs are in [`references/sources.md`](references/sources.md). If a source cannot be reached, say so in the plan and mark the item *(unverified)*.
4. **Never claim an effect that is not documented.** If a lever is speculative (e.g. llms.txt), say it is speculative and rank it accordingly.
5. **Write the plans in the project's language** (README, UI), in its register (formal or informal "you"). Name the plan files in that language too, except `00-summary.md`, which keeps its name in every language.
6. **Reuse the site's existing data sources** (RSS feed, sitemap, caches, database) instead of inventing new calls.
7. **Decisions that belong to the user are presented, not taken**: blocking AI crawlers, consent strategy, analytics tool. Give the trade-off and a recommendation.
8. **If there is nothing to fix, say so.** A short plan on a healthy site is a correct result; do not pad it with invented problems.
9. **Be polite with every site you touch** ([`references/politeness.md`](references/politeness.md)): the user's own site only with their permission, other sites read-only (at most 3 competitors, 1 page each, robots.txt respected), API keys never written anywhere, paid API calls counted and confirmed first.

## Scope and mode

Read them from the arguments or the request, before Phase 1. Defaults: full audit, new plans, live checks if the site is deployed.

| Argument | Same as asking for… | Effect |
| --- | --- | --- |
| *(none)* / `all` | "an SEO audit" | Every applicable plan |
| `technical` | "a technical SEO audit" | Technical SEO plan only |
| `ai` | "AI visibility", "GEO", "llms.txt", "être cité par ChatGPT" | AI-visibility plan only (it still reports blocking technical issues, briefly) |
| `analytics` | "an analytics plan", "consent", "mesure d'audience" | Analytics and consent plan only |
| `indexnow` | "IndexNow" | IndexNow plan only |
| `programmatic` | "programmatic SEO pages" | Programmatic SEO plan only |
| `update` | "update the audit", "where are we", "mets à jour l'audit" | **Update mode**: see below |
| `compare <url> […]` | "compare with my competitors" | Also compare one of the user's pages with up to 3 competitor pages (`compare.mjs`, read-only). Facts go into the relevant plans as findings, never as "do what they do" |
| `search-data` | "what do people search", "Search Console data" | Also read real search data (Search Console, Bing Webmaster) if the user provides access: see [`references/search-data.md`](references/search-data.md) |
| `ai-check` | "are we cited by ChatGPT / Perplexity / Claude?" | Also ask AI assistants the target questions through their APIs and record which sources they cite (paid): see [`references/ai-mentions.md`](references/ai-mentions.md) |
| `--url <url>` | "the site is at …" | Use this URL for the live checks instead of looking for the production domain |
| `--no-live` | "don't touch the live site" | Skip Phase 2; mark online checks *(not checked: --no-live)* |

Several can be combined (`technical ai --no-live`). A narrowed scope still writes `00-summary.md`, stating the scope, and its **Not verified** section lists the themes left out.

**Update mode.** If the plans folder already contains `00-summary.md` and the user did not ask for a fresh audit, ask whether to update the existing plans or start over (default in a non-interactive run: update). Updating follows [`references/update-mode.md`](references/update-mode.md): re-check every action, tick what is now done with proof, flag regressions, add new findings, never rewrite the user's notes.

## Phase 1 — Analyze the project (local)

Identify the stack first, then read [`references/stacks.md`](references/stacks.md) for where SEO lives in that stack (Next.js, Nuxt, Astro, plain PHP, WordPress, Laravel, static HTML…).

Write down:

- Stack, framework, deployment mode (Vercel, VPS, shared hosting, static host…).
- Language(s) and **target country or countries**: they decide the consent regime (see [`references/consent.md`](references/consent.md)) and whether hreflang is needed.
- Public routes (pages, dynamic resources), noindex pages, redirects.
- Existing SEO: sitemap, robots.txt, RSS feed, canonicals, hreflang, JSON-LD (which `@type`), title/meta description, Open Graph, About and legal pages.
- Existing analytics: tag, consent banner, Consent Mode.
- The production domain (README, `SITE_URL`-like constants, env files, CMS settings).

**Not deployed?** Run Phase 2 against a local server if one starts easily; otherwise skip Phase 2, say so at the top of every plan, and mark every online check *(to verify after deployment)*.

## Phase 2 — Audit the live site (if deployed)

**Run the bundled scripts first** (Node 18+, no dependencies, in this skill's `scripts/` folder). They read the raw HTML **as served**, headers and status codes; never use a web-fetch tool for these checks, it converts pages to Markdown and can drop JSON-LD, headers and status codes.

1. **Site and home page:**
   `node <skill>/scripts/check-live.mjs https://<domain>/`
   Redirect chain, status, `X-Robots-Tag`, title, description, meta robots, canonical, hreflang, h1, Open Graph, word count of the served HTML (flags an empty JavaScript app root), every JSON-LD block (parsed, types listed, invalid blocks flagged), host variants (HTTP → HTTPS, www / non-www), robots.txt, sitemap (with a sample of URLs), llms.txt, soft-404 test. Ends with a **Findings** list and the manual-check links (Rich Results Test, PageSpeed Insights).
2. **One page of each template**, picked from the sitemap sample:
   `node <skill>/scripts/check-live.mjs <page URL> --no-site`
3. **robots.txt against the AI crawler list:**
   `node <skill>/scripts/robots-check.mjs https://<domain>/ [--path blog/post ...]`
   Status of every crawler in [`references/ai-crawlers.md`](references/ai-crawlers.md) (blocked, partial, allowed), the rule that decided it, deprecated tokens, and search agents blocked by accident. Also works on a local file: `robots-check.mjs public/robots.txt`. Write `--path` values without the leading slash: Git Bash on Windows rewrites `/admin` into a Windows path.

4. **Raw HTML against rendered DOM**, when the site uses a JavaScript framework, when `check-live.mjs` reports few words or an empty app root, or when titles / canonicals look set by scripts:
   `node <skill>/scripts/render-compare.mjs <page URL>`
   Runs the page in a headless Chrome or Edge and compares title, description, robots, canonical, h1, word count, links and JSON-LD before and after JavaScript. What only exists after JavaScript is seen by Google (later) but by most AI crawlers not at all. Exit code 3 means no browser was found: say so and rely on the raw HTML.
5. **Server logs**, if the user can give access to them (see [`references/server-logs.md`](references/server-logs.md)):
   `node <skill>/scripts/log-bots.mjs <access.log> [more files]`
   Which search and AI crawlers actually visit, how often, which pages, which status codes.
6. **Competitors**, only with the `compare` scope (rule 9):
   `node <skill>/scripts/compare.mjs <user's page URL> <competitor page URL> [up to 2 more]`
   Title and description lengths, h1, served words, links, `og:image`, hreflang, top-level JSON-LD types, and which AI agents each site's robots.txt blocks. Skips pages a competitor's robots.txt forbids.

Add `--json` to any script for machine-readable output.

**Then interpret.** The scripts report facts, not verdicts: a canonical pointing elsewhere may be intended, a 2-word page may be a legitimate form. Check each finding against the project before it goes into a plan, and check JSON-LD fields against Google's documented requirements for the type (see [`references/structured-data.md`](references/structured-data.md)).

Fall back to `curl -sI` / `curl -sL` if Node is not available, and for anything the scripts do not cover (RSS feed, IndexNow key file, a specific header). Core Web Vitals have no script: give the PageSpeed Insights link; field data, when available, is what counts.

The scripts send a few sequential requests with a pause and identify themselves. Only run them on sites the user owns or has permission to audit.

## Phase 3 — Write the plans (one .md file per theme)

Every plan follows the fixed format in [`references/output-format.md`](references/output-format.md): header (date, scope, legend), blocks rated **impact H/M/L** and **effort S/M/L** and ordered by return for the effort, checkboxes, **code** actions separated from **manual** actions (external consoles). Tick upfront what the audit showed as already done, with the proof in italics.

Only write the plans that apply. Default themes, each with its reference:

| Plan | When | Reference |
| --- | --- | --- |
| Technical SEO | Always | [`references/plan-technical-seo.md`](references/plan-technical-seo.md) |
| AI visibility (GEO) | Always | [`references/plan-ai-visibility.md`](references/plan-ai-visibility.md), [`references/ai-crawlers.md`](references/ai-crawlers.md) |
| Analytics and consent | Always (even to say "no analytics, and that is fine") | [`references/plan-analytics.md`](references/plan-analytics.md), [`references/consent.md`](references/consent.md) |
| IndexNow | Site with regular new or updated pages | [`references/plan-indexnow.md`](references/plan-indexnow.md) |
| Programmatic SEO | Project with structured data that can be declined into pages | [`references/plan-programmatic-seo.md`](references/plan-programmatic-seo.md) |

Structured-data gaps go into the relevant plan (usually Technical SEO), following [`references/structured-data.md`](references/structured-data.md).

**Optional modules**, when the project matches (their blocks go into the plans above unless the module says otherwise):

| Module | When | Reference |
| --- | --- | --- |
| Local business | Customers come to an address, or a local service area (shop, workshop, restaurant, lodging, trades) | [`references/module-local.md`](references/module-local.md) |
| E-commerce | The site sells products with a price | [`references/module-ecommerce.md`](references/module-ecommerce.md) |
| Images and video | Images or videos are content, not decoration (portfolio, recipes, products, tutorials) | [`references/module-media.md`](references/module-media.md) |

## Phase 4 — Report

- Write **`00-summary.md`** in the plans folder, following [`references/output-format.md`](references/output-format.md): the top 5 actions across all plans, the decisions that belong to the user, what could not be verified and why, and the list of plan files.
- In the chat, give a short version of the summary and the path to the file.
- Offer to implement the first block, and only do it on request.
- During later implementation: tick boxes with proof, date the checks, keep the plans up to date at each step. A full re-check later is the update mode.
