# Plan: IndexNow

Only for a site with regular new or updated pages.

## Facts (verify at the source)

- Participants on 2026-10-03, from `https://www.indexnow.org/searchengines.json`: Bing, Yandex, Seznam, Naver, Yep, Internet Archive, Amazon. URLs sent to one are shared with all. **Google does not take part.**
- Key: 8 to 128 characters, `a-z`, `A-Z`, `0-9` and `-`. Served at `/<key>.txt` (public by design, fine to commit), or at another location declared with `keyLocation`.
- Up to 10,000 URLs per POST to `https://api.indexnow.org/indexnow`.
- HTTP 429 = too many requests (potential spam): stop and retry the next day.

## Plan

1. Generate a key, serve the key file, check it with `curl`.
2. Choose the trigger:
   - **The site has a publish event** (CMS save, deploy hook): ping the changed URLs at that moment. On WordPress, an SEO plugin or the official IndexNow plugin may already do it: check before adding code.
   - **No publish event**: a daily cron that replays the recent RSS feed / sitemap entries plus the "hot" daily pages, with a **local diff** so only new or changed URLs are sent. Engines judge the reliability of pings.
3. Never send noindex, redirected or 404 URLs.
4. Log each submission (date, number of URLs, status) to spot 4xx / 429.
5. Manual: in Bing Webmaster Tools, check the IndexNow report.
