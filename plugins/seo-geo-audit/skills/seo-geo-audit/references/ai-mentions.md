# Asking AI assistants: is the site cited?

The direct test of AI visibility: ask the questions the site should answer, through the assistants' APIs with web search on, and record which sources they cite. Use it with the `ai-check` scope only. API formats checked 2026-10-03 *(verify: these APIs change quickly; Perplexity's Sonar API ended on 2026-09-27 and was replaced by the Agent API)*.

## It costs money: confirm first

Each question × engine × run is one paid call with web search (on the Claude API, web search is $10 per 1,000 searches plus tokens; check each provider's pricing). Run the script **without `--yes` first**: it prints the number of calls and sends nothing. Tell the user the plan, get their agreement, then re-run with `--yes`. Start small: 3 to 5 questions, 1 run.

## Setup

Keys in environment variables, never in files of the project or in the plans:

| Engine | Key | Also |
| --- | --- | --- |
| Claude | `ANTHROPIC_API_KEY` | `CLAUDE_MODEL` (default `claude-opus-5-5`) |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_MODEL` **required**: a current model that supports the `web_search` tool |
| Perplexity | `PERPLEXITY_API_KEY` | `PERPLEXITY_PRESET` (default `fast`) |

Engines without a key are skipped and listed as such.

## Questions

Write the questions people actually ask, in their words and language, not the brand name: "best pottery class in Nantes for beginners", not "Atelier Brun". Sources: the queries from Search Console (see [`search-data.md`](search-data.md)), the site's FAQ, what customers ask. One per line in a file:

```
node <skill>/scripts/ai-mentions.mjs --domain example.com --questions questions.txt
node <skill>/scripts/ai-mentions.mjs --domain example.com --questions questions.txt --yes
```

`--engines claude,perplexity` to limit engines, `--runs 3` to see how stable the answers are.

## Reading the output

- **Cited in n/m**: the site is among the sources the answer cites.
- **Read but not cited**: the assistant found the page in its search results but did not use it. Usually a content problem: no plain sentence that answers the question, facts buried, or a competitor's page answers it better.
- **Cites instead**: the domains cited in its place. Look at what those pages do (plainly worded answers, dates, figures, lists) before concluding anything; [`compare.mjs`](../scripts/compare.mjs) can compare one of them.
- **Refused / error**: reported as such, never counted as "not cited".
- Results vary between runs, accounts, locations and days. Treat them as a sample: a trend over months says more than one run. API answers can also differ from the consumer apps.

## In the plans

- In the AI-visibility plan, block "Measure": the date, the engines, the questions, the results table, and the next check date (monthly is enough).
- Questions where the site is read but not cited go into the "Citable content" block, with the page that should answer them.
- Never quote long passages of an assistant's answer in the plans; the citation counts and domains are what matter.
