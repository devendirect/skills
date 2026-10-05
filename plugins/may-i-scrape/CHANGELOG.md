# Changelog — may-i-scrape

## 0.2.0 — 2026-10-04

Terms of use and a sourced legal framework. Green verdicts are now possible.

### Added

- **Terms of use**: `scripts/find-terms.mjs` finds them (links on the page, else on the home page, French and English, at most 3 pages, same site, robots.txt respected); `scripts/extract-clauses.mjs` keeps only the paragraphs about scraping, robots, extraction, databases, mining / AI or reuse (`scripts/keywords.json`, `references/keywords.md`), each with a stable id.
- **Classification by the model** (`--classify`): each clause is labelled `prohibited`, `conditional`, `allowed` or `unrelated` per purpose, and the script applies the table again. New codes: R4 (prohibited clause), G5 (clause that explicitly allows the use, covers O4 / O5); O6 now also covers conditional and unclassified clauses; G4 (`lookup`) needs the terms read with nothing restrictive.
- **Offline mode** (`--offline`, `--robots-file`, `--page-file`, `--headers-file`, `--terms-file`): nothing is sent; what was not pasted is listed as not verified. New code O9 (robots.txt not checked).
- **Legal framework**, quoted from the official texts and dated: `references/legal-eu.md` (Directive 96/9/EC, Data Act art. 43, Ryanair C-30/14, Directive 2019/790 art. 2–4 and recital 18, AI Act art. 53, GDPR art. 4 / 6 / 14), `legal-fr.md` (CPI L122-5-3 / L342-1 / L342-3, CNIL sheet on web scraping, CRPA L321-1 to L322-2), `legal-de.md` (UrhG §§ 44b, 60d, 87a–87e; LAION, LG Hamburg 2024 and OLG Hamburg 2025), `legal-uk.md` (CDPA s. 29A, the 2026 government report, database regulations 1997, Computer Misuse Act, UK GDPR, ICO) and `references/legal-us.md` (CFAA and Van Buren, hiQ v. LinkedIn, Meta v. Bright Data, 17 U.S.C. §§ 102 / 103 / 105 / 107, Feist, first decisions on AI training and fair use, CCPA). "Which law" guidance in `SKILL.md`: which files to read depending on where the user, the site and the people in the data are; other countries not covered. Unchecked points are marked *(to verify)* and not stated as facts.
- Pending cases tracked in the legal files with their dates: BGH I ZR 281/25 (LAION, judgment announced for 2026-12-17), CJEU C-250/25 (Like Company v Google), Third Circuit in Thomson Reuters v. Ross (2026-09-30).
- `references/good-practices.md`: user agent, rate, 429 (RFC 6585), cache, personal data, records.
- `SKILL.md` audited for dated prompting patterns (none found): the offline-mode sentence now says missing inputs rule out green while a pasted rule or clause can still make the verdict red; a Git Bash note inherited from seo-geo-audit, with no use here, removed; the personal-data field named exactly (`signals.personal_data.level`).
- Classification rules made explicit in `references/decision-table.md` and `SKILL.md`: "forbidden without our permission / without a licence" is `prohibited` (two headless runs had labelled it `conditional`, giving orange instead of red); `conditional` is for conditions the user may not meet (non-commercial only, listed reasons); good-practice conditions keep `allowed`; generic copyright notices are `unrelated` for lookup and monitor.
- Full-skill runs, headless: `tests/may-i-scrape/run-skill-evals.mjs` with 10 scenarios (`skill-evals.json`: ban in the terms, request to bypass a challenge, clean lookup in English, AI training, unclear purpose); 5/5 on 2026-10-04.
- Real-site test set: `tests/may-i-scrape/run-real-sites.mjs`, 53 sites with expectations written before the runs (by hand, not in CI).
- `tests/may-i-scrape/check-sources.mjs` (monthly in CI) and `test-keywords.mjs`; six new fake sites (ban, ambiguous clause, no clause, explicit permission, terms on the home page, offline).

### Keeping it up to date

- Every report carries `facts` (the oldest "Last checked" date of `SKILL.md` and the `legal-*.md` files, `scripts/lib/freshness.mjs`); a copy more than 183 days old is flagged and the skill tells the user to update the plugin.
- `tests/may-i-scrape/check-sources.mjs` checks the date of each legal file (90 days in CI), not only `SKILL.md`.
- `tests/may-i-scrape/watch.json` + `check-watch.mjs`: dated watch list (BGH LAION judgment, CJEU C-250/25, Ross, Bartz, IETF aipref, quarterly legal review); a weekly CI job opens one GitHub issue per due item, without duplicates. Tested against a mock GitHub API (`test-maintenance.mjs`).

### Changed

- O3 (TDM reserved or AI training crawlers blocked) now makes only `bulk` orange; for `lookup`, `monitor` and `republish` it is a note (these are not mining). Seen on a real site: a one-off lookup on an open archive was orange only because the site blocks AI crawlers.

- Disclaimer reworded: the verdict reflects machine-readable signals and the passages of the terms with scraping-related words; have the project checked by a lawyer. Shown at the end of every report and every answer.
- JSON report schema 2 (`signals.terms` with pages and clauses, `mode`).
- The user agent no longer carries a version number.

### Fixed

- Found on a real-site test set of 53 sites (`tests/may-i-scrape/real-sites/`, results in `results-2026-10-04.md`):
  - challenge pages served with HTTP 200 (Imperva, DataDome, PerimeterX, AWS WAF, generic) are now access restrictions (O2), which also made those runs stable;
  - pages are decoded with their declared charset (Latin-1 terms lost their accented keywords);
  - links to terms of use must match the whole link text or a whole path segment (news articles, glossaries and "451 Unavailable For Legal Reasons" were taken for terms);
  - a long clause without full stops is cut around its keyword instead of collapsing to "…";
  - "automatique / automatically" no longer selects payment or update clauses;
  - acceptable-use pages linked from the terms are read (within the 3-page budget);
  - robots.txt answering 401 / 403 / 418 / 429 is reported as an access restriction.
- Keywords: "script" no longer matches "inscription", "entraîner" (to lead to) no longer counts as AI training.
- Terms marked read but not found can no longer lead to a green `lookup`.

## 0.1.0 — 2026-10-04

First preview: machine-readable signals and the decision table. Terms of use are not read yet, so no verdict is green. Not reviewed by a lawyer.

### Added

- **Decision table** (`scripts/lib/verdict.mjs`, `references/decision-table.md`): red R1–R4, orange O1–O8, positive signals G1, G2, G4, per purpose (`lookup`, `monitor`, `bulk`, `ai-tdm`, `republish`). Pure function: same signals, same verdict. No green without a positive signal.
- `scripts/run-all.mjs`: runs every check and gives the verdict for one purpose or all five, as text or JSON (schema 1), with what could not be verified and the requests sent.
- `scripts/check-robots.mjs`: robots.txt for the path, for the user's agent (`--agent`) and for AI training crawlers; `Crawl-delay`; sitemaps. RFC 9309: unreachable robots.txt (5xx) means everything is disallowed.
- `scripts/check-page.mjs`: status, `X-Robots-Tag`, meta robots, JavaScript rendering, challenge page (`cf-mitigated: challenge`), captcha, login, paywall markup (`isAccessibleForFree: false`), personal-data hints.
- `scripts/check-tdm.mjs`: TDMRep (W3C CG final report, 2024-05-10): `tdmrep.json` (first matching rule wins), headers, meta, in that order of precedence.
- `scripts/detect-licence.mjs`: Licence Ouverte, ODbL, Creative Commons, CC0; data licence vs site-content licence; non-commercial / no-derivatives / share-alike conditions.
- `scripts/detect-public-body.mjs`: `gouv.fr` hosts.
- `scripts/find-alternatives.mjs`: `/.well-known/api-catalog` (RFC 9727), API / developer / open-data links, RSS / Atom feeds, sitemaps; data.gouv.fr datasets with `--datagouv` only (sends the domain to a third party).
- Polite client (`scripts/lib/http.mjs`): one request at a time with a pause, honest user agent, robots.txt respected for the skill's own reads, caps on requests and response size, no retry.
- **Disclaimer** at the end of every report and every answer, in the user's language, whatever the colour: we are not lawyers, machine-readable signals only, have the project checked by a lawyer before collecting or reusing data.
- `--volume` (1000 pages or more counts as substantial extraction) and `--personal-data likely` (can only make the verdict stricter).
- Shared code copied from `seo-geo-audit` (`lib/robots.mjs`, `lib/html.mjs`, `ai-crawlers.json`), kept identical by `tools/sync-libs.mjs` (checked in CI).
- Tests outside the plugin (`tests/may-i-scrape/`): 12 fake sites, 28 checks each run twice (identical reports required), and unit tests of the decision table; run in CI.
