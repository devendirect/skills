# Politeness: visiting sites

Every script identifies itself (`seo-geo-audit (Claude Code skill; …)`), sends requests one after the other with a pause, and only reads.

## The user's own site

- Run the scripts only on a site the user owns or is allowed to audit. If the README or the request does not make that clear, ask before Phase 2.
- A few dozen requests per audit is the normal load (one page per template, robots.txt, sitemap, a few host variants). Never crawl the whole site: the sitemap sample is enough.
- Staging or local servers: same rules; do not hammer a shared staging server.

## Other people's sites (competitor comparison)

- **Read-only, public pages only.** No login, no forms, no search boxes, no cart, no API calls, no paid pages.
- **At most 3 competitors and 1 page each** per run, given by the user or agreed with them. Not a crawl.
- **Respect their robots.txt.** `compare.mjs` reads it first and skips a page its rules forbid (for its own user agent or `*`).
- **One request at a time per site, with a pause.** The script waits between requests to the same host.
- **Only aggregated facts go in the plans** (title length, JSON-LD types, word count, which AI agents their robots.txt blocks). No copied text beyond a short quote, no screenshots of their pages in the repo.
- A site that answers 403, 429 or a challenge page: stop, report it as "not accessible to scripts", do not retry or change the user agent.

## APIs

- Search Console, Bing Webmaster and AI assistant APIs use the user's own credentials. Never write keys or tokens into the plans or the repo; read them from environment variables or a file the user points to.
- Paid APIs (AI assistants): say how many calls a run will make before starting, keep it small, and let the user confirm.
