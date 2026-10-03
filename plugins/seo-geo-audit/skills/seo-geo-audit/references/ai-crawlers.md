# AI crawlers and robots.txt

Last checked 2026-10-03 against each operator's page (see [`sources.md`](sources.md)). This list changes often: re-check the operators that matter for the project before writing the plan *(verify)*.

The same list lives in [`../scripts/ai-crawlers.json`](../scripts/ai-crawlers.json), read by `robots-check.mjs` and `log-bots.mjs`. **Update both together.** In the JSON, `robotsOnly: true` marks tokens that only exist in robots.txt and never appear in logs (`Google-Extended`, `Applebot-Extended`).

## Three families

| Family | What blocking it costs | Default recommendation for a site that lives on visibility |
| --- | --- | --- |
| **Search / citation**: indexes pages to cite them in AI answers | The site disappears from that assistant's answers | **Never block** |
| **User-triggered fetch**: visits a page because a user asked | The assistant cannot open the page on request; some of these ignore robots.txt anyway | Do not block |
| **Training**: collects content to train models | Nothing on search visibility, **except where noted** | User's decision |

## By operator

| Operator | Token | Family | Respects robots.txt | Notes |
| --- | --- | --- | --- | --- |
| OpenAI | `OAI-SearchBot` | Search | Yes | ChatGPT search results |
| OpenAI | `ChatGPT-User` | User fetch | "may not apply" | |
| OpenAI | `GPTBot` | Training | Yes | |
| OpenAI | `OAI-AdsBot` | Ads | Yes | Checks ad landing pages |
| Anthropic | `Claude-SearchBot` | Search | Yes | |
| Anthropic | `Claude-User` | User fetch | Yes | |
| Anthropic | `ClaudeBot` | Training | Yes | `Claude-Web` and `anthropic-ai` are deprecated: rules on them no longer do anything |
| Perplexity | `PerplexityBot` | Search | Yes | |
| Perplexity | `Perplexity-User` | User fetch | Generally no | |
| Google | `Googlebot` | Search | Yes | Also feeds AI Overviews and AI Mode: they cannot be blocked separately from Search |
| Google | `Google-Extended` | Training **and grounding** | Yes | No effect on Google Search or AI Overviews, **but blocking it removes the site from Gemini's grounding** (answers built from the Search index). Not "free" to block. |
| Microsoft | `Bingbot` | Search | Yes | Copilot and ChatGPT search both draw on Bing: never block |
| Apple | `Applebot` | Search (+ training) | Yes | Powers Siri, Spotlight, Safari |
| Apple | `Applebot-Extended` | Training opt-out token | Yes | Blocking it keeps the site in Siri / Spotlight / Safari |
| Meta | `meta-externalagent` | Training / product indexing | Yes | |
| Meta | `meta-webindexer` | Search (Meta AI) | Yes | |
| Meta | `meta-externalfetcher` | User fetch | May bypass | |
| Meta | `facebookexternalhit` | Link previews | May bypass | Needs Open Graph tags in the first 1 MB |
| Amazon | `Amzn-SearchBot` | Search (Alexa) | Yes | Not used for training |
| Amazon | `Amzn-User` | User fetch | May not | |
| Amazon | `Amazonbot` | Mixed (products + training) | Yes | Blocking it is a training opt-out with some product cost |
| Mistral | `MistralAI-Index` | Search | Yes | |
| Mistral | `MistralAI-User` | User fetch | Yes | |
| Mistral | `MistralAI-Training` | Training | Yes | |
| DuckDuckGo | `DuckAssistBot` | Search (AI answers) | Yes | Not used for training; no effect on organic ranking |
| Common Crawl | `CCBot` | Training (public dataset reused by many models) | Yes | |

## How to present it

- Show the current robots.txt rules and what each one actually blocks, with the table above.
- Flag rules on deprecated tokens and any rule that blocks a search family by accident (a broad `User-agent: *` + `Disallow: /`, or a CDN "block AI bots" toggle).
- Present the training question as a user decision, with its real cost (Google-Extended, Amazonbot). Recommend keeping every search and user-fetch agent open.
- robots.txt is a request, not access control: user-triggered agents may ignore it. Real blocking means server or CDN rules, with the same trade-offs.
