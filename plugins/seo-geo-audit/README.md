# seo-geo-audit

A Claude Code skill that audits a web project and writes **action plans**, not code: technical SEO, structured data, visibility in AI assistants (GEO), analytics and consent, IndexNow, programmatic SEO. Every checked box comes with its proof; everything it could not verify is listed as such.

Version and changes: [`CHANGELOG.md`](CHANGELOG.md). Facts last checked against official sources: **2026-10-03**.

## What you get

A folder of Markdown plans, `docs/seo/` by default, in the project's language:

```
docs/seo/
  00-summary.md        top 5 actions, decisions for you, what is in place, what was not verified
  technical-seo.md     (named in the project's language, e.g. seo-technique.md)
  ai-visibility.md
  analytics.md
  indexnow.md          if the site publishes regularly
  programmatic-seo.md  if the project has data that can become pages
```

Each plan is a list of blocks rated **impact H/M/L × effort S/M/L**, with code actions and manual actions (consoles) separated, and a **Done when** check per block. `[x]` means "in place and verified", with the proof next to it.

Nothing is implemented during the audit. Ask for a block afterwards, one at a time.

## Use

In Claude Code, inside the project to audit, ask in plain words ("audit SEO", "are we visible in ChatGPT?", "mets à jour l'audit"), or invoke the skill:

- installed as a plugin: `/seo-geo-audit:seo-geo-audit [options]`
- installed by hand: `/seo-geo-audit [options]`

## Options

Combine them freely, e.g. `technical ai --no-live`, or say them in words.

| Option | Same as asking for… | Effect |
| --- | --- | --- |
| *(none)* / `all` | "an SEO audit" | Every plan that applies |
| `technical` | "a technical SEO audit" | Technical SEO plan only |
| `ai` | "AI visibility", "GEO", "llms.txt" | AI-visibility plan only |
| `analytics` | "an analytics plan", "consent" | Analytics and consent plan only |
| `indexnow` | "IndexNow" | IndexNow plan only |
| `programmatic` | "programmatic SEO pages" | Programmatic SEO plan only |
| `update` | "update the audit", "where are we" | Re-checks existing plans: ticks what is done, flags regressions, adds new findings, keeps your notes |
| `compare <url> […]` | "compare with my competitors" | Compares one of your pages with up to 3 competitor pages (read-only) |
| `search-data` | "what do people search" | Reads real search data: Search Console export or API, Bing Webmaster API |
| `ai-check` | "are we cited by ChatGPT / Perplexity / Claude?" | Asks AI assistants your target questions through their APIs (**paid**, asks before spending) |
| `--url <url>` | "the site is at …" | Live checks on this URL |
| `--no-live` | "don't touch the live site" | Code only, no request to the site |

Optional modules switch on by themselves when the project matches: **local business** (LocalBusiness, Business Profile), **e-commerce** (merchant listings, Merchant Center, faceted navigation), **images and video**.

## Requirements

| For | You need |
| --- | --- |
| Every audit | Claude Code. **Node 18+** for the scripts (without Node, the skill falls back to `curl`) |
| Raw HTML vs rendered page | Chrome, Chromium or Edge installed (optional) |
| Crawler visits | Your server's access logs (optional) |
| `search-data` | A Search Console export (no setup), or a service-account key / token, or a Bing Webmaster API key |
| `ai-check` | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` + `OPENAI_MODEL`, and / or `PERPLEXITY_API_KEY` |

Keys are read from environment variables and never written in the plans. Setup steps: [`references/search-data.md`](skills/seo-geo-audit/references/search-data.md), [`references/ai-mentions.md`](skills/seo-geo-audit/references/ai-mentions.md).

## Cost and politeness

- An audit is a normal Claude Code session (a full audit took 3 to 5 minutes in our tests).
- `ai-check` calls paid APIs: the script announces the number of calls and sends nothing until you agree.
- The skill only audits sites you own or may audit. Competitor pages: read-only, 3 sites and 1 page each at most, their robots.txt respected. Rules: [`references/politeness.md`](skills/seo-geo-audit/references/politeness.md).

## Scripts

The skill runs them itself; you can also run them alone (`--json` on all of them):

| Script | What it does |
| --- | --- |
| `check-live.mjs <url>` | Page and site from the served HTML: redirects, headers, meta, canonical, hreflang, JSON-LD, host variants, robots.txt, sitemap, llms.txt, soft 404 |
| `robots-check.mjs <url\|file>` | Which search and AI crawlers robots.txt lets in, and which rule decides |
| `render-compare.mjs <url>` | Raw HTML against the page rendered by a headless browser |
| `log-bots.mjs <access.log> […]` | Crawler visits per agent, and visitors sent by AI assistants |
| `compare.mjs <your url> <competitor url> […]` | Your page against up to 3 competitor pages |
| `search-data.mjs csv\|gsc\|inspect\|bing …` | Search Console and Bing data: top queries, near-top queries, queries never clicked |
| `ai-mentions.mjs --domain … --question …` | Whether AI assistants cite the site (paid, needs `--yes`) |

They live in [`skills/seo-geo-audit/scripts/`](skills/seo-geo-audit/scripts/).

## Tests

Test projects and the results of full runs: [`tests/seo-geo-audit/`](../../tests/seo-geo-audit/) at the repository root.

## Limits

- Not legal advice: consent sections must be confirmed for your jurisdiction.
- AI visibility cannot be guaranteed by anyone; the skill says which levers are documented and which are speculative (llms.txt is the latter).
- Search engines and AI crawlers change often. The skill re-checks its facts at the source; the repository checks its sources monthly.
