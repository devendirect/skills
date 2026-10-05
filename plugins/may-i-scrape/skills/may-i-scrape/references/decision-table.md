# Decision table

Applied by `scripts/lib/verdict.mjs`, for one purpose at a time. **Red** if any R applies; else **orange** if any O is left uncovered; else **green**, which always needs a positive signal (O7 makes sure of it). Each verdict lists every code that applied.

The only input that comes from you (the model) is the classification of the clauses of the terms of use (`--classify`). Everything else comes from the site.

## Red

| Code | Signal | Purposes |
| --- | --- | --- |
| R1 | robots.txt disallows the path for the user's agent (its own group, else `*`), or robots.txt is unreachable (5xx, no answer: RFC 9309 says to assume everything is disallowed) | all |
| R2 | TDM rights reserved for this path (TDMRep: `tdmrep.json`, `tdm-reservation` header or meta) | `ai-tdm` |
| R3 | robots.txt blocks AI training crawlers (GPTBot, CCBot, Google-Extended…) on this path. Whether this is an "appropriate" reservation in law is *(to verify)*; it is a clear statement of the site's wishes | `ai-tdm` |
| R4 | A clause of the terms classified `prohibited` for this purpose. For `ai-tdm`, a clause that reserves text and data mining counts: Directive 2019/790, recital 18, names "terms and conditions of a website", but whether a plain-language reservation is "machine-readable" is disputed (OLG Hamburg, 2025, `legal-de.md`); the site's objection is clear either way | the purposes it was classified for |

## Orange

| Code | Signal | Covered by |
| --- | --- | --- |
| O1 | Personal data likely (Person / ProfilePage / Review markup, several mailto: / tel: links, or `--personal-data likely`) | nothing: the GDPR applies even under an open licence or explicit permission |
| O2 | Access restricted: challenge page, captcha, 401 / 403 / 429 / 503, login, paywall markup | nothing: use an alternative, never a workaround |
| O3 | TDM reserved or AI training crawlers blocked, purpose `bulk` (bulk extraction is close to mining). For `lookup`, `monitor` and `republish` it is only a note: these are not mining, but the data must not be reused for AI or mining | nothing |
| O4 | Substantial extraction: purpose `bulk`, or `--volume` of 1000 pages or more (database right may apply) | G1, G2, G5 |
| O5 | Republication or resale (copyright, database right) | G1 (unless non-commercial or no-derivatives), G2, G5 |
| O6 | Terms of use not found or not read; a clause classified `conditional`; a clause **not classified** for this purpose | nothing |
| O7 | No positive signal | — |
| O8 | The page itself could not be checked (robots.txt forbids this tool, network error, 404, not pasted offline…) | nothing |
| O9 | robots.txt not checked (offline mode without the robots.txt) | nothing |

## Green: positive signals

| Code | Signal |
| --- | --- |
| G1 | An open licence covering **the data** (Licence Ouverte, ODbL, or a licence attached to a schema.org `Dataset`), compatible with the purpose. A licence of the site's content (footer, `rel="license"`) is reported but does not count |
| G2 | French public body (`gouv.fr`): presumption of free reuse of published public information (CRPA art. L321-1), never for personal data or third-party rights |
| G4 | `lookup` only: robots.txt allows the path, the terms were found and read, and no clause is prohibited, conditional or unclassified |
| G5 | A clause of the terms classified `allowed` for this purpose |

An official API or dataset is not a green light for scraping: it is reported as an **alternative**, to use instead.

## Classifying clauses

`run-all.mjs` lists the paragraphs of the terms that mention scraping, robots, extraction, databases, mining / AI or reuse, each with an id. For **each purpose asked**, give each clause one label:

| Label | When | Effect |
| --- | --- | --- |
| `prohibited` | The clause forbids this use, or automated access / extraction in general, or reserves text and data mining (for `ai-tdm`). **"Forbidden without our (written) permission" or "without a licence" is `prohibited`**: it is a ban until the user has that permission, and the advice is the same (do not scrape; ask). Only if the user says they already have it does it become `allowed` (say so in the answer) | R4 |
| `conditional` | The clause allows this use, but only under a condition the user may not meet and that cannot be checked here: non-commercial use only when the purpose may be commercial; only for research or other listed reasons; an account or a subscription required | O6 |
| `allowed` | The clause **explicitly** allows this use, including by automated means. Conditions that are good practices the user can simply follow (a rate limit, identifying the tool, citing the source) keep it `allowed`; repeat them in the answer. A general "you may view the site" is not enough | G5 |
| `unrelated` | The clause does not concern this use (cookies, orders, trademarks, the site's own use of AI…). Generic copyright notices ("toute reproduction … interdite sans autorisation", "all rights reserved") concern republication: `unrelated` for `lookup` and `monitor` unless they mention automated access, extraction or scraping; `prohibited` for `republish` and `bulk` | none |

These rules were made explicit after two headless runs labelled the same kind of clause ("interdite sans accord écrit") once `prohibited` and once `conditional`. When a clause still fits two labels, take the stricter one (`prohibited` > `conditional` > `unrelated` > `allowed`). Then run again with `--classify '{"<id>": {"<purpose>": "<label>"}}'` (or `{"<id>": "<label>"}` for every purpose). A clause left without a label for a purpose keeps that purpose orange (O6).

## Shown without effect on the colour

`noindex` / `nofollow` (indexing, not collection), JavaScript needed to render the content, `Crawl-delay` (goes into the good practices), "all rights reserved" mentions.
