# Good practices for a polite scraper

For an **orange** verdict where the user goes ahead. Never for red, and never to get round a protection (see the absolute rules in `SKILL.md`). Pick the ones that fit; do not paste the whole list.

## Ask first

- **Use the official way** when one exists: the API catalog, an API or open-data link, a feed, a sitemap, a dataset on data.gouv.fr. It is more stable than scraping, and its own terms say what is allowed.
- **Ask the site.** A short email saying who you are, what you collect, how often, and why. Keep the answer.

## Identify yourself

- A user agent that names the scraper and gives a way to reach you: `mybot/1.0 (+https://example.com/bot; contact@example.com)`. Never a browser's user agent, never a rotating one.
- Check robots.txt with that exact token (`run-all.mjs --agent mybot`).

## Go slowly

- One request at a time. `Crawl-delay` is not part of RFC 9309, but when a site sets it, respect it; otherwise about one request per second or slower, and less during the site's busy hours.
- **Stop on 429 or 403.** RFC 6585: 429 means "too many requests in a given amount of time"; the server "MAY include a Retry-After header indicating how long to wait". Wait at least that long, slow down for good, or stop. Do not switch IP, user agent or session to carry on.
- Re-read robots.txt regularly (once a day for a long-running job): rules change.

## Take less

- **Only the pages and fields you need.** Use the sitemap or feed instead of crawling links.
- **Cache** what you fetched and send conditional requests (`If-Modified-Since`, `If-None-Match`) instead of downloading again.
- For `monitor`, the lowest frequency that answers the need; repeated extraction of small parts can still be a problem for a database (see `legal-eu.md` § 1, art. 7(5), and `legal-uk.md` § 2, reg. 16(2)).

## Personal data

- Do not collect personal data unless the project needs it and has a lawful basis under the GDPR or UK GDPR (`legal-eu.md` § 4, `legal-uk.md` § 4).
- Filter it out at collection time, not later; delete what was collected by mistake.
- Only freely accessible pages: nothing behind a login or an account (the CNIL lists this among its measures for AI training).
- Tell people: a public page saying what is collected, why, and how to object.

## Keep a record

- What was collected, when, from where, under which robots.txt, terms and licence (date them: they change). The skill's JSON report (`--json`) is a good start.
- The licence conditions: cite the source and the date when the licence or the CRPA asks for it (art. L322-1 for French public information).
