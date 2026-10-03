# Server logs: who actually visits

Logs answer what the other checks cannot: do the search and AI crawlers come, how often, which pages, and do AI assistants send visitors. Only use them if the user gives access; they contain IP addresses (personal data). The script only outputs aggregated counts: never copy raw log lines or IPs into a plan.

## Where the logs are

Ask the user; do not go looking on a server. Usual places *(verify for the host)*:

| Setup | Access logs |
| --- | --- |
| Apache (incl. WAMP / XAMPP / MAMP) | `logs/access.log` in the server folder, or the `CustomLog` path in the Apache config; `/var/log/apache2/access.log` on Debian / Ubuntu |
| Nginx | `/var/log/nginx/access.log`, or the `access_log` path in the config |
| Shared hosting (cPanel, Plesk…) | A "Raw access logs" or "Logs" page in the panel, often as `.gz` files |
| Serverless / static hosts (Vercel, Netlify…) | Usually no raw access logs on basic plans; log drains or the host's analytics on higher plans |
| Behind a CDN (Cloudflare…) | The origin logs miss cached hits; the CDN's own bot analytics are the better source |

Rotated files (`access.log.1`, `access.log.2.gz`…) can all be passed at once. A week is a minimum; a month is better.

## Run

```
node <skill>/scripts/log-bots.mjs <access.log> [access.log.1 access.log.2.gz …]
```

It needs the **combined** log format (with referrer and user agent), the default on most servers. If it says the user agent is missing, the server logs in the "common" format: changing it is a plan action (Apache `LogFormat … combined`, Nginx `log_format combined`).

## Reading the output

- **Search agents with zero hits** (Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot, PerplexityBot…) over a month: check robots.txt (`robots-check.mjs`), the CDN's bot settings (some block AI agents by default), and whether the site is submitted to the search consoles.
- **Many 4xx / 5xx for one crawler**: old URLs without redirects, or a firewall rule answering 403. Point to the paths shown.
- **Robots.txt-only tokens** (`Google-Extended`, `Applebot-Extended`) never appear in logs: they are not crawlers, only opt-out tokens read by `Googlebot` / `Applebot`. Zero is expected.
- **Visitors sent by AI assistants** (referrer `chatgpt.com`, `perplexity.ai`, `claude.ai`, `copilot.microsoft.com`, `gemini.google.com`): the most direct sign of being cited. Many assistants send no referrer, so this is a floor, not a total.
- **User agents can be faked.** Before a decision that depends on a surprising number, verify the IPs against the ranges the operators publish (links in [`sources.md`](sources.md); Google documents a reverse-DNS check).

## In the plans

- Facts from the logs go in **Finding** lines with the period covered (`*proof: log-bots.mjs, access.log 2026-09-01 → 2026-09-30*`).
- Crawler visits belong in the AI-visibility plan (block "Measure"), errors seen by crawlers in the technical plan.
- No logs available: say so in **Not verified**, and suggest them as a manual action only if the site's visibility in AI assistants matters to the user.
