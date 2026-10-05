# may-i-scrape — tests

Outside the plugin folder, so they are not installed with it. Node 18+, no dependencies.

## Automatic (CI on every push)

| Command | What it checks |
| --- | --- |
| `node run-script-tests.mjs [fixture …]` | `run-all.mjs` against fake sites (`fixtures/`, one trap each), every check run twice (identical reports), no green without a positive signal, offline mode, request log |
| `node test-verdict.mjs` | The decision table on hand-made signals, green cases included |
| `node test-keywords.mjs` | Which clauses of terms of use are kept or dropped, which links count as terms, charsets; every false positive met on a real site has a case |
| `node test-maintenance.mjs` | Freshness of the legal facts, the watch list and its GitHub issues (mock API) |

The fake sites pretend to be real hosts (`fixture.json` → `host`); `serve.mjs <fixture> [port]` serves one by hand.

## Scheduled (CI)

| Command | When | What |
| --- | --- | --- |
| `node check-sources.mjs` | monthly | Every official source in `references/sources.md` still answers; each `legal-*.md` checked less than 90 days ago. Légifrance and leginfo block scripts: listed "by hand" |
| `node check-watch.mjs [--create-issues]` | weekly | `watch.json`: decisions announced, pending cases, quarterly legal review; one GitHub issue per due item |

## By hand (network to third parties, or paid)

| Command | Cost | What |
| --- | --- | --- |
| `node run-real-sites.mjs record --cache DIR` then `replay --cache DIR --classify FILE --out FILE` | free, about 25 polite requests per site | 53 real sites (`real-sites/sites.json`, expectations written before the runs), clauses classified by the model (`real-sites/classifications.json`). Results: `real-sites/results-2026-10-04.md` |
| `node run-skill-evals.mjs [--out DIR] [id …]` | about $0.25 and 40 s per scenario | The full skill, headless (`claude -p`), on fake sites: answer, commands, tools, disclaimer. Scenarios: `skill-evals.json`. Results: `skill-evals-results-2026-10-04.md` |
| `node run-trigger-evals.mjs [--description-file F] [--runs N] [--split train\|test\|all]` | about $0.12 per call, $7 for a full pass (20 queries × 3) | Does Claude consult the skill? `trigger-evals.json` (10 should, 10 near misses). Results: `trigger-evals-results-2026-10-05.md` (20 / 20) |

Say the cost before running a paid one; run scenarios one after the other. These three scripts refuse to run when imported, so a check of their syntax (`node --check`) never starts a paid pass.
