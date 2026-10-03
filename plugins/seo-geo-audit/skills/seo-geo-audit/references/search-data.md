# Real search data (Search Console, Bing Webmaster)

What the other checks cannot see: which queries show the site, at which position, and which ones get clicks. Use it with the `search-data` scope, or whenever the user offers access. Steps checked 2026-10-03 *(verify: console menus move)*.

## Pick the easiest access

| Access | What the user does | Command |
| --- | --- | --- |
| **Export (no setup)** | Search Console → Performance → set the period (3 months+) → Export → CSV (or Google Sheets, then download as CSV). The zip has `Queries.csv` and `Pages.csv`. | `node <skill>/scripts/search-data.mjs csv Queries.csv` |
| **Search Console API, service account** | Google Cloud console: create a project, enable the *Google Search Console API*, create a service account, download its JSON key. Search Console → Settings → Users and permissions → add the service account's email (restricted permission is enough). | `GSC_KEY_FILE=key.json node <skill>/scripts/search-data.mjs gsc --site sc-domain:example.com` |
| **Search Console API, existing token** | A token with the `webmasters.readonly` scope from a tool the user already has. | `GSC_ACCESS_TOKEN=… node <skill>/scripts/search-data.mjs gsc --site …` |
| **Bing Webmaster** | Bing Webmaster Tools → Settings → API access → generate an API key. | `BING_WEBMASTER_API_KEY=… node <skill>/scripts/search-data.mjs bing --site https://example.com/` |

- `--site`: `sc-domain:example.com` for a domain property, or the exact URL-prefix property **with its trailing slash** (`https://example.com/`). A 403 usually means a wrong property string or an account that is not a user of it.
- `--dimension page` lists pages instead of queries. `--days 90` sets the period (the last 3 days are left out: they are incomplete).
- One page's index status (indexed? which canonical Google chose? blocked by noindex?): `search-data.mjs inspect --site … --url https://example.com/page`.
- Keys and tokens only in environment variables. Never write them in the plans, the repo or the chat.

## Reading the output

- **Top by clicks**: what already works; protect it (no URL changes without redirects).
- **Seen often, ranked 4–20**: the cheapest gains. Check the page that ranks: does it answer that query plainly, in its title and first paragraph?
- **Seen, never clicked**: a page that ranks for a query it does not really answer, or a title / description that does not match the search. Also the input of programmatic SEO: real queries with no page (see [`plan-programmatic-seo.md`](plan-programmatic-seo.md)).
- **URL inspection**: when a page should be indexed and is not, the `coverageState` and `indexingState` say why; `googleCanonical` different from `userCanonical` means Google picked another URL.
- Bing's numbers are smaller and its positions are given as the API returns them: compare trends within Bing, not with Google.

## In the plans

- Each fact with its source and period: `*proof: Search Console export, 2026-07-01 → 2026-09-30*`.
- Queries and pages go into the existing plans: the technical plan (titles, pages that rank 4–20), AI visibility (the questions people ask, to answer in plain sentences), programmatic SEO (queries without a page).
- No access: list it in **Not verified** and add the export as a manual action; it takes the user two minutes.
