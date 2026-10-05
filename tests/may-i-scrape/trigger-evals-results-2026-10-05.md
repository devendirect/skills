# Description triggering: results

Run on 2026-10-05 with `node run-trigger-evals.mjs` (Claude Code 2.1.289, the session's default model), on the 20 queries of `trigger-evals.json` (written before the run and approved by the user), 3 runs per query, `--max-turns 1`, only the Skill and Read tools allowed.

**Result: 20 / 20 as expected, every query at 0 % or 100 %.**

| | As expected | Trigger rate |
| --- | --- | --- |
| Should trigger (10): someone about to collect data from a site they do not own | 10 / 10 | 100 % on every query |
| Should not trigger (10): near misses | 10 / 10 | 0 % on every query |

The near misses went where they belong: the SEO audit of one's own site to `seo-geo-audit`, the CRM clean-up and the data.gouv import straight to a shell, the GitHub API, Cloudflare bot blocking, cookies under the GDPR and the pasted HTML answered without any tool.

**Decision: the description is kept as it is.** With nothing to fix on this set, an optimisation loop would only cost money (and risk overfitting a description that already separates the cases cleanly). The French trigger phrases flagged by the prompt audit stay: they are routing text, and nothing here shows them to be harmful.

**Cost: $7.30 for 60 calls (about $0.12 per call)**, more than the $1.5–3 estimated beforehand: each call is a fresh Claude Code session. Budget about $7 per full pass of this set.

## Next time

- Re-run after any change to the description, or when a new skill that overlaps with this one is installed (competition for the same requests).
- To make the set harder: requests where scraping is implicit ("monitor my competitors' prices"), a site the user may own ("my Shopify store"), API-first services, and other languages.
