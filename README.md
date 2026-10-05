# Skills

Claude Code skills by DevEnDirect, packaged as a plugin marketplace.

| Plugin | What it does |
| --- | --- |
| [`seo-geo-audit`](plugins/seo-geo-audit/) | Audits a web project (technical SEO, structured data, visibility in AI assistants, analytics and consent, IndexNow, programmatic SEO) and writes Markdown action plans with checkboxes. Options for updates, competitors, real search data and AI-assistant checks. It plans, it does not implement. **Options, requirements and scripts: [its README](plugins/seo-geo-audit/README.md).** |
| [`may-i-scrape`](plugins/may-i-scrape/) | Before you scrape a site: checks robots.txt, AI crawler rules, text and data mining reservations, open licences, public bodies, access protections and the clauses of the terms of use, then gives a green / orange / red verdict for your purpose, with the legal texts behind it and an official alternative when there is one. Never helps bypass a protection. Not legal advice. **[Its README](plugins/may-i-scrape/README.md).** |

## Install

Replace `OWNER/REPO` with this repository's GitHub path.

**As a Claude Code plugin** (recommended, updates with `/plugin`):

```
/plugin marketplace add OWNER/REPO
/plugin install seo-geo-audit@devendirect
/plugin install may-i-scrape@devendirect
```

The skill is then available as `/seo-geo-audit:seo-geo-audit`, and triggers on its own when you ask for an SEO audit.

**With the `skills` CLI** (also installs for other agents):

```bash
npx skills add OWNER/REPO --skill seo-geo-audit
npx skills add OWNER/REPO --skill may-i-scrape
```

**By hand:** copy the skill folder into your personal skills directory, then restart Claude Code.

```bash
cp -r plugins/seo-geo-audit/skills/seo-geo-audit ~/.claude/skills/
```

The skill's scripts need Node 18 or later.

## Layout

```
.claude-plugin/marketplace.json     the marketplace: lists the plugins
plugins/<plugin>/
  .claude-plugin/plugin.json        plugin manifest (name, version)
  skills/<skill>/SKILL.md           the skill, its references/ and scripts/
  README.md                         what it does, options, requirements
  CHANGELOG.md
tests/<plugin>/                     test projects, not shipped with the plugin
tools/sync-libs.mjs                 copies code shared between plugins (seo-geo-audit is the source)
.github/workflows/checks.yml        CI: script tests on every push, sources monthly
```

Check the manifests before publishing:

```bash
claude plugin validate --strict .
claude plugin validate --strict plugins/seo-geo-audit
claude plugin validate --strict plugins/may-i-scrape
node tools/sync-libs.mjs --check                 # code shared between plugins is identical
```

## Tests

Each plugin can have tests in `tests/<plugin>/`, outside the plugin folder so they are not installed with it. For `seo-geo-audit`:

```bash
node tests/seo-geo-audit/run-script-tests.mjs   # scripts against the test projects
node tests/seo-geo-audit/test-apis.mjs          # API modes against local mocks
node tests/seo-geo-audit/check-sources.mjs      # official sources still where the skill says
bash tests/seo-geo-audit/run-skill-evals.sh     # full skill, headless (uses real usage)
```

Details and the results of full runs: [`tests/seo-geo-audit/README.md`](tests/seo-geo-audit/README.md).

For `may-i-scrape`:

```bash
node tests/may-i-scrape/run-script-tests.mjs    # scripts against fake sites
node tests/may-i-scrape/test-verdict.mjs        # decision table
node tests/may-i-scrape/test-keywords.mjs       # which clauses of terms of use are kept
node tests/may-i-scrape/check-sources.mjs       # official sources still where the skill says
```

## Freshness

Search engines, AI crawlers and consent rules change often. Each skill states the date its facts were last checked, and tells the model to re-check them at the official source before relying on them. `check-sources.mjs` runs monthly in CI. See [`plugins/seo-geo-audit/CHANGELOG.md`](plugins/seo-geo-audit/CHANGELOG.md).

## License

MIT, see [LICENSE](LICENSE). Nothing here is legal advice: the authors are not lawyers. Consent and privacy sections of `seo-geo-audit` must be confirmed for your jurisdiction; `may-i-scrape` verdicts must be checked by a lawyer before collecting or reusing data.
