# seo-geo-audit — test projects

Small projects, each built around one trap. They test the skill at two levels.

| # | Fixture | Port | The trap |
| --- | --- | --- | --- |
| 01 | `01-healthy` | 8701 | A clean site: does it invent problems? |
| 02 | `02-spa-empty` | 8702 | Content only exists after JavaScript: does it see the one problem that matters? |
| 03 | `03-wordpress-noindex` | 8703 | French WordPress left in noindex, GA4 without consent: right fix, right language? |
| 04 | `04-lying-jsonld` | 8704 | Valid JSON-LD that contradicts the page: does a clean parse fool it? |
| 05 | `05-not-deployed` | — | Next.js with no URL: does it pretend to have checked a live site? |
| 06 | `06-multilingual-no-hreflang` | 8706 | Scripts find nothing, the problems are between pages: does it stop at the scripts? |
| 07 | `07-update-mode` | 8707 | Existing plans with the owner's notes, some fixes done, one regression: does the update mode keep the notes and catch the regression? |
| 08 | `08-server-logs` | — | Script-level only: a sample access log (plain and `.gz`) for `log-bots.mjs`. |
| 09 | `09-search-data` | — | Script-level only: Search Console exports in English and French for `search-data.mjs csv`. |

Each fixture has:

- `fixture.json`: port and folder to serve (the "deployed" site).
- `expected.json`: what the scripts must and must not report (level 1).
- `expected.md`: what the full audit must do and must not do (level 2).
- The project itself, as the skill would find it.

## Level 1 — scripts (automatic)

```bash
node run-script-tests.mjs                 # all fixtures
node run-script-tests.mjs 02-spa-empty    # one fixture
```

Starts each fixture's server when needed, runs the scripts named in `expected.json` (`check-live`, `robots-check`, `log-bots`) with `--json`, and compares their findings. Exit code 1 on any failure. Node 18+, no dependencies.

### API modes (mocked)

```bash
node test-apis.mjs
```

Runs `search-data.mjs` (Search Console API with a real signed service-account JWT, URL inspection, Bing) and `ai-mentions.mjs` (Claude, OpenAI, Perplexity) against a local mock of each API: request shapes, auth headers, `pause_turn`, refusals, errors, keys never printed, no paid call without `--yes`. The mocks follow the documented formats of 2026-10-03; they cannot prove the real APIs still answer that way. A first run with real keys is the final check.

### Without automatic tests

`render-compare.mjs` needs a local Chrome or Edge, so it has no automatic test; check it by hand on `02-spa-empty` (content, links and h1 only after JavaScript) and `01-healthy` (no difference). `compare.mjs` needs several servers at once: run `02-spa-empty` against `01-healthy`, `04-lying-jsonld` and `03-wordpress-noindex` with a `/wp-admin/` URL (must be skipped by robots.txt), and check that a 4th competitor is refused.

## Sources and freshness

```bash
node check-sources.mjs
```

Checks that every URL in the skill's `references/sources.md` still answers at its documented address (reports pages that are gone, moved, or that block scripts), and that the "last checked" date in `SKILL.md` is less than 90 days old. Runs monthly in CI (`.github/workflows/checks.yml`). When it reports a move: open the new page, check the fact it supports, update `sources.md`.

## Level 2 — the full skill

### Automated run

```bash
bash run-skill-evals.sh                    # all fixtures, one after the other
bash run-skill-evals.sh 06-multilingual-no-hreflang
```

Runs the skill headless (`claude -p`) on a copy of each fixture, with the fixture's server running, and prints where the plans are. You still score them by hand against `expected.md`.

- **Cost:** each audit is a full Claude Code session, about 4–5 minutes and real usage. Running all six can hit a usage limit; the script stops cleanly and the finished audits stay complete.
- **Windows:** the model often runs the scripts through PowerShell. The script allows it; if you write your own runner, allow `PowerShell` as well as `Bash`, or the live checks are silently skipped (check `permission_denials` in the JSON log).
- The skill is installed in each copy as `seo-geo-audit-under-test`, so a globally installed `seo-geo-audit` cannot be picked up by mistake.

### Manual run

For each fixture:

1. Copy the fixture to a scratch folder, so the plans do not land in this repo:
   ```bash
   cp -r fixtures/03-wordpress-noindex /tmp/audit-03
   ```
2. If it has a port, serve it from this folder, in another terminal:
   ```bash
   node serve.mjs 03-wordpress-noindex
   ```
3. Open Claude Code in the copy, with the skill installed, and run `/seo-geo-audit`. Accept the default plans folder.
4. Score the plans against `expected.md`: every **Must** box ticked, no **Must not** box ticked.

A fixture passes when all its **Must** items are met and no **Must not** item happens. Note the result and the date; the skill is non-deterministic, so run a failing fixture twice before concluding.

Do not show `expected.md` to the model being tested: copy the fixture without it, or delete it from the copy.

## Results log

| Date | Skill | 01 | 02 | 03 | 04 | 05 | 06 | 07 | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-10-03 | 2.3.0 | pass | pass | pass | pass | pass | partial | — | 06: root 302 ticked as fine; summary file name translated. 03: observed problems ticked `[x]`. Fixed in 2.4.0. |
| 2026-10-03 | 2.6.0 | — | — | — | — | — | — | pass | Update mode: 3 fixes ticked with proof, noindex regression unticked and raised to top priority, owner's notes and reviews decision kept word for word, blocks not renumbered, Bing tick kept as "not re-checked". $0.82, 156 s. |
| 2026-10-03 | 2.4.0 | — | — | pass | — | — | pass | — | Re-run of 03 and 06 only. 06: 302 found and turned into a decision block (301 + `x-default`). Both: `00-summary.md`, `[x]` only for what is in place, problems as findings. |

## Adding a fixture

One trap per fixture, tied to a rule of the skill. Keep the project small, give it a believable README (domain, audience, language), and write `expected.md` before running the skill on it.
