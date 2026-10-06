# Repo: Claude Code skills (DevEnDirect)

A plugin marketplace (`.claude-plugin/marketplace.json`, name `devendirect`) with one plugin per folder in `plugins/`. Public-facing text (skills, READMEs, CHANGELOGs, scripts) is in English; working notes are in French, and so is the conversation with the user. Working notes live in `notes/<plugin>/` (gitignored, never published: do not link to them from public files).

## Plugins

| Plugin | State | Start here |
| --- | --- | --- |
| `seo-geo-audit` | v2.7.2, working, tested | `plugins/seo-geo-audit/README.md`, `CHANGELOG.md`, `notes/seo-geo-audit/TODO.md`; prompt audit done (2.7.1); next: trigger eval of the description (`skill-creator`, or a copy of `tests/may-i-scrape/run-trigger-evals.mjs` on Windows) |
| `may-i-scrape` | v0.2.0, phases 0–3 done: signals, terms of use classified by the model, sourced legal framework (EU, FR, DE, UK, US), offline mode; tested on 53 real sites, 10 headless scenarios, trigger eval 20/20 | `plugins/may-i-scrape/README.md`, `CHANGELOG.md`, `notes/may-i-scrape/TODO.md`. Next: keep-up-to-date work (text fingerprints, Légifrance, law watch) before 2027-01-04, then publication |

## Rules

- **Never `git commit` (or push) unless the user explicitly asks in that turn.**
- **Scripts: Node 18+, no dependencies** (`.mjs`, built-in `fetch`, no `npm install`). APIs are called with raw `fetch` on purpose, even the Claude API, so the installed skill runs anywhere.
- **Each plugin is self-contained**: an installed plugin cannot read another plugin's files. Code shared between plugins (`scripts/lib/robots.mjs`, `scripts/lib/html.mjs`, `scripts/ai-crawlers.json` from `seo-geo-audit`) is copied into each plugin; keep the copies identical: edit the source in `seo-geo-audit`, then run `node tools/sync-libs.mjs` (CI runs it with `--check`).
- **Tests live outside the plugin**, in `tests/<plugin>/`, so they are not installed with it.
- **Facts about search engines, crawlers, APIs and law are checked at the official source, dated, and listed in `references/sources.md`**; anything unchecked is marked *(verify)*. Do not write them from memory.
- **Compliance, not evasion**: no skill here helps to bypass robots.txt, anti-bot protections, logins or paywalls.

## Checks before saying something is done

```bash
claude plugin validate --strict .
claude plugin validate --strict plugins/<plugin>
node tests/seo-geo-audit/run-script-tests.mjs
node tests/seo-geo-audit/test-apis.mjs
node tests/seo-geo-audit/check-sources.mjs
node tools/sync-libs.mjs --check
node tests/may-i-scrape/test-verdict.mjs
node tests/may-i-scrape/test-keywords.mjs
node tests/may-i-scrape/test-maintenance.mjs
node tests/may-i-scrape/check-watch.mjs        # legal watch list: what is due
node tests/may-i-scrape/run-script-tests.mjs
node tests/may-i-scrape/check-sources.mjs
```

`npx skills add D:/wamp64/www/pro/skills --list` (run from another folder) checks the skills CLI still finds every skill.

## Pitfalls already met

- **SKILL.md frontmatter must be strict YAML.** Quote the `description` (`description: "…"`): an unquoted `: ` inside it passes `claude plugin validate` but makes `npx skills` reject the skill.
- **Git Bash on Windows rewrites arguments that start with `/`** (`/admin` → `C:/Program Files/Git/admin`). Scripts take paths without the leading slash, or use `MSYS_NO_PATHCONV=1`.
- **Headless runs (`claude -p`) on Windows need `PowerShell` in `--allowedTools`** as well as `Bash`, or every script call is silently denied (check `permission_denials` in the JSON log). See `tests/seo-geo-audit/run-skill-evals.sh`.
- **A test server started in the background keeps its port** after the command ends: stop it (`netstat -ano | grep :PORT`, then `taskkill //PID … //F`) before the next run.
- **Python `urllib.robotparser` is not RFC 9309-compliant** (no `*` / `$` wildcards, first match instead of longest match): use `lib/robots.mjs`.
- **Full skill runs cost real usage** (seo-geo-audit: about $1 and 4–5 minutes each; may-i-scrape: about $0.25 and 40 s each, `tests/may-i-scrape/run-skill-evals.mjs`). Say so before launching them; run them one after the other so a usage limit does not lose them all.
- **EUR-Lex and Légifrance block scripted requests.** Read EU texts from the Publications Office: `curl -L -H "Accept: application/xhtml+xml" -H "Accept-Language: eng" http://publications.europa.eu/resource/celex/<CELEX>`. Légifrance articles: WebFetch works, curl gets 403.
- **Court opinions are PDFs that WebFetch often cannot read** (CID fonts, object streams). Extract the text with a small Node script (inflate the streams, read ToUnicode maps, unpack /ObjStm) in the scratchpad; if the key sentence still cannot be read, mark it *(verify)* rather than trusting a search summary. `leginfo.legislature.ca.gov` and Légifrance stall or block scripts: `check-sources.mjs` lists them as "by hand".
- **JSON patterns: `\b` in a .json file must be written `\\b`** (a single backslash-b is a backspace character). Edit `keywords.json` with the Edit tool and run `test-keywords.mjs`.
- **Paid test scripts must not run on import.** `node -e "import(...)"` to check a script once started a full $7 pass. `run-skill-evals.mjs`, `run-trigger-evals.mjs` and `run-real-sites.mjs` now throw when imported; check syntax with `node --check`. Trigger evals cost about $0.12 per call (fresh session each).
- **skill-creator's `run_loop.py` / `run_eval.py` do not work on Windows** (`select()` on pipes): use `tests/may-i-scrape/run-trigger-evals.mjs`.
- **Writing code through a Bash heredoc can lose backslashes** (`[/\\]` came out as `[/\]` and broke a regex): write `.mjs` files with the Write tool.
