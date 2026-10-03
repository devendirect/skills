# Plan: visibility in AI assistants (GEO)

Order by what is known to work. **Being in the search indexes the assistants draw on comes first**; speculative levers come last and are labeled as such.

## 1. Content readable without JavaScript

Most AI crawlers do not run JavaScript. If the key content is not in the served HTML (`curl -sL`), nothing below matters: server rendering or static generation comes first. Covered in the technical plan; reference it here, do not duplicate it.

## 2. robots.txt: keep search agents open

See [`ai-crawlers.md`](ai-crawlers.md). Search and user-fetch agents open, Bingbot open. Training agents: the user's decision, with its real cost (Google-Extended affects Gemini grounding). Fix rules on deprecated tokens.

## 3. Bing Webmaster Tools (manual)

Copilot and ChatGPT search draw on Bing. Account, site verification, sitemap, then IndexNow ([`plan-indexnow.md`](plan-indexnow.md)).

## 4. Citable content

- A complete, plain answer sentence to the domain's typical question, in the page text: models quote sentences, not badges or images.
- Absolute dates ("updated on 3 October 2026"), not "yesterday".
- Ranked lists with the ranking criterion stated.
- A short FAQ using the wording people actually type. FAQPage markup is optional and gives no rich result on most sites (see [`structured-data.md`](structured-data.md)).
- Sources and figures attributed, so a model can cite them with confidence.

## 5. Entity and reputation

- About page: who runs the site, what it covers, where the data comes from, how often it is updated.
- Consistent brand name everywhere (site, social profiles, directories). `Organization` JSON-LD with `sameAs` links to official profiles.
- Mentions on other sites: assistants lean on what third parties say. This is a manual, long-term action.

## 6. llms.txt (speculative, cheap)

A Markdown summary served at `/llms.txt` (title, one-sentence blockquote, commented links to key pages), optionally `/llms-full.txt` with detailed content generated from existing data.

**State the uncertainty in the plan:** it is a community proposal (llmstxt.org). No major search engine or assistant has documented that it uses it *(verify)*. Worth doing only because it is cheap; never rank it above blocks 1–5.

If done: add a sync rule to the project's AGENTS.md / CLAUDE.md ("a new public route updates llms.txt in the same commit"), or generate it from the routes.

## 7. Measure

- An analytics channel for AI referrers: `chatgpt.com`, `perplexity.ai`, `claude.ai`, `copilot.microsoft.com`, `gemini.google.com` *(verify the list)*.
- Server logs or CDN analytics: hits from the search agents in [`ai-crawlers.md`](ai-crawlers.md). With access logs, run `log-bots.mjs` (see [`server-logs.md`](server-logs.md)): crawler visits per agent and visitors sent by AI assistants.
- A monthly manual check: ask the target question in ChatGPT, Perplexity, Claude and Gemini, note whether the site is cited and which page. With API keys and the user's agreement on the cost, `ai-mentions.mjs` does it for Claude, OpenAI and Perplexity (see [`ai-mentions.md`](ai-mentions.md)).
