# may-i-scrape

A Claude Code skill that answers, for one website and one purpose: **may I collect this data, and how do I do it politely?** It reads the site's machine-readable signals and the clauses of its terms of use about scraping, applies a fixed decision table and gives a **green / orange / red** verdict with the signals behind it, plus an official alternative when there is one.

> **We are not lawyers and this is not legal advice.** The skill reads what a site publishes in machine-readable form and the passages of its terms that mention scraping-related words; it can miss or misread clauses. Have your project checked by a lawyer before collecting or reusing data. Every answer ends with this warning.

Version and changes: [`CHANGELOG.md`](CHANGELOG.md). Specifications and legal texts last checked against official sources: **2026-10-04**.

## What it does

You give a URL and say what you want to do with the data. The skill:

1. reads robots.txt for the path (your scraper's user agent, else `*`), including the rules aimed at AI training crawlers, `Crawl-delay` and sitemaps;
2. reads the page as served: status, `X-Robots-Tag`, meta robots, whether the content needs JavaScript, signs of a challenge page, captcha, login or paywall, hints of personal data;
3. reads the text and data mining reservation (TDMRep: `/.well-known/tdmrep.json`, headers, meta);
4. looks for an open licence, and tells apart the licence of the **data** from that of the site's content;
5. recognises French public bodies (`gouv.fr`);
6. finds the terms of use (links on the page or the home page, French and English) and keeps only the paragraphs about scraping, robots, extraction, databases, mining / AI or reuse; Claude classifies each one for your purpose (prohibited, conditional, allowed, unrelated) and the script applies the table again;
7. looks for official alternatives: `/.well-known/api-catalog`, API or open-data links, feeds, sitemaps, and (only if you agree) datasets on data.gouv.fr;
8. explains the verdict in your language, with the legal texts behind it (quoted from official sources), what could not be verified, good practices if you go ahead, and the disclaimer.

The verdict depends on the purpose:

| Purpose | Meaning |
| --- | --- |
| `lookup` | A few pages, once, personal use or research |
| `monitor` | The same pages again and again |
| `bulk` | A whole catalogue or database, or a large part of it |
| `ai-tdm` | Training a model, text and data mining |
| `republish` | Showing the data elsewhere, or selling it |

## What it does not do

- **It never helps bypass a protection**: no browser-like or rotating user agents, no proxies, no captcha solving, no login or paywall workaround, no ignoring robots.txt. A protected or forbidden page gets an orange or red verdict and an alternative.
- **It never says "green" without a positive signal.** The absence of a ban is not a permission.
- **It does not replace a lawyer** (see the warning above).

## The verdict

- 🔴 **Red**: robots.txt forbids the path (or is unreachable); the site reserves mining rights or blocks AI training crawlers and the purpose is AI / mining; or a clause of the terms forbids this use.
- 🟠 **Orange**: personal data likely, access restricted, mining reserved and the purpose is bulk extraction, substantial extraction or republication without a licence or permission, terms not found or with a conditional or unclassified clause, page or robots.txt not checked, or simply no positive signal.
- 🟢 **Green**: no red, every orange point covered, and a positive signal that fits the purpose: an open licence on the data, a public body, terms that explicitly allow this use, or a one-off lookup with terms read and no restrictive clause.

Every code and the classification rules are in [`references/decision-table.md`](skills/may-i-scrape/references/decision-table.md). The model explains the verdict and classifies the clauses; the rules stay in the script.

## Use

In Claude Code, say it in plain words ("can I scrape this site?", « ai-je le droit de récupérer les données de cette page ? »), or invoke the skill:

- installed as a plugin: `/may-i-scrape:may-i-scrape <URL> [purpose]`
- installed by hand: `/may-i-scrape <URL> [purpose]`

The skill asks for the purpose if it is not clear.

**No network?** Paste the robots.txt, the page's HTML, the response headers and / or the terms into files; the skill runs offline on them and lists what it could not check.

## Requirements

Claude Code and **Node 18+**. No package to install. Network access to the site checked, or the offline mode.

## Politeness and privacy

- At most robots.txt, the page, `tdmrep.json`, `api-catalog`, the home page and 3 pages of terms per check, one request at a time with a pause, with a user agent that says what it is (`may-i-scrape (Claude Code skill; …)`).
- robots.txt is respected for the skill's own reads: if a site forbids it, the page is not read and the verdict says so.
- Nothing is sent anywhere but the site checked. The data.gouv.fr search sends the domain name to data.gouv.fr, so it only runs with `--datagouv`, after you agree. Offline mode sends nothing.

## Scripts

The skill runs `run-all.mjs` itself; every script also runs alone and prints JSON:

| Script | What it does |
| --- | --- |
| `run-all.mjs <url> [--purpose p] [--agent token] [--volume N[/day]] [--personal-data likely] [--classify JSON\|file] [--datagouv] [--robots-file f] [--page-file f] [--headers-file f] [--terms-file f] [--json]` | All the checks below, then the verdict for one purpose or all five |
| `check-robots.mjs <url> [--agent token]` | robots.txt for the path, AI training crawlers, `Crawl-delay`, sitemaps (RFC 9309 matching) |
| `check-page.mjs <url>` | Status, `X-Robots-Tag`, meta robots, JavaScript rendering, protections, personal-data hints |
| `check-tdm.mjs <url>` | TDMRep reservation and policy, with the layer that decided |
| `detect-licence.mjs <url>` | Open licences, data vs site content, non-commercial / no-derivatives / share-alike conditions |
| `detect-public-body.mjs <url>` | French public body from the hostname (no request) |
| `find-alternatives.mjs <url> [--datagouv]` | API catalog, API / open-data links, feeds, sitemaps, data.gouv.fr datasets |
| `find-terms.mjs <url>` | Links to the terms of use, legal notice, and which pages were read |
| `extract-clauses.mjs <url>` | The paragraphs of the terms that mention scraping-related words, with their ids |

They live in [`skills/may-i-scrape/scripts/`](skills/may-i-scrape/scripts/).

## References

| File | Content |
| --- | --- |
| [`legal-eu.md`](skills/may-i-scrape/references/legal-eu.md) | EU, common to the 27: database right (Directive 96/9/EC, Data Act art. 43), contractual restrictions (Ryanair), text and data mining (Directive 2019/790, AI Act art. 53), GDPR |
| [`legal-fr.md`](skills/may-i-scrape/references/legal-fr.md) | France: CPI (database right, TDM L122-5-3), the CNIL on web scraping, reuse of public information (CRPA) |
| [`legal-de.md`](skills/may-i-scrape/references/legal-de.md) | Germany: UrhG §§ 44b, 60d, 87a–87e, and the LAION decisions (Hamburg, 2024 and 2025) on whether a plain-language reservation is machine-readable |
| [`legal-uk.md`](skills/may-i-scrape/references/legal-uk.md) | United Kingdom: TDM only for non-commercial research (CDPA s. 29A, no reform in the 2026 report), database regulations 1997, Computer Misuse Act, UK GDPR and the ICO |
| [`legal-us.md`](skills/may-i-scrape/references/legal-us.md) | CFAA (Van Buren, hiQ v. LinkedIn), terms of use (Meta v. Bright Data), copyright of facts (Feist) and fair use, first AI-training decisions, California privacy law (CCPA): quoted from the official texts and opinions |
| [`good-practices.md`](skills/may-i-scrape/references/good-practices.md) | User agent, rate, 429, cache, personal data, records |
| [`keywords.md`](skills/may-i-scrape/references/keywords.md) | How the terms are found and which words select a clause, and the known gaps |
| [`sources.md`](skills/may-i-scrape/references/sources.md) | Every official source, with the date it was checked |

## Tests

Fake sites (one trap each: robots.txt wildcards, TDMRep rules, open licence, `gouv.fr`, challenge page, declared API, AI crawlers blocked, personal data, robots.txt that forbids the skill, unreachable robots.txt, terms with a ban, an ambiguous clause, no clause, an explicit permission, terms linked only from the home page, offline mode), unit tests of the decision table and of the keywords: [`tests/may-i-scrape/`](../../tests/may-i-scrape/) at the repository root.

```bash
node tests/may-i-scrape/run-script-tests.mjs
node tests/may-i-scrape/test-verdict.mjs
node tests/may-i-scrape/test-keywords.mjs
node tests/may-i-scrape/test-maintenance.mjs
node tests/may-i-scrape/run-real-sites.mjs record --cache DIR   # 53 real sites, by hand only (not in CI)
node tests/may-i-scrape/check-sources.mjs   # official sources still answer, each legal file checked < 90 days ago (monthly in CI)
node tests/may-i-scrape/check-watch.mjs     # decisions and reviews now due (weekly in CI, opens GitHub issues)
```

## Limits

- Laws and decisions change. Each legal file is dated; every report says when the legal facts were last checked, and warns when this copy is more than 6 months old: update the plugin.
- Only the paragraphs of the terms with scraping-related words are read: a ban phrased otherwise is missed. Skim the terms yourself when it matters.
- Terms in PDF, behind a login, or in a language other than French or English are not read.
- Personal-data detection only catches obvious signs (Person / Review markup, contact links). If the data is about people, say so: the verdict gets stricter.
- Only `gouv.fr` hosts are recognised as public bodies; local authorities and `.gov` are not yet.
- Law covered: EU (with France and Germany in detail), United Kingdom, United States. Other countries: the verdict still applies (it rests on the site's own signals), but the legal explanation does not.
- US scraping law is mostly case law, split between circuits and states, and moving fast on AI training: the US file says which decisions are first-instance or preliminary.
