# Skills

Claude Code skills by DevEnDirect, packaged as a plugin marketplace.

| Plugin | What it does |
| --- | --- |
| [`seo-geo-audit`](plugins/seo-geo-audit/) | Audits a web project (technical SEO, structured data, visibility in AI assistants, analytics and consent, IndexNow, programmatic SEO) and writes Markdown action plans with checkboxes. It plans, it does not implement. |

## Install

Replace `OWNER/REPO` with this repository's GitHub path.

**As a Claude Code plugin** (recommended, updates with `/plugin`):

```
/plugin marketplace add OWNER/REPO
/plugin install seo-geo-audit@devendirect
```

The skill is then available as `/seo-geo-audit:seo-geo-audit`, and triggers on its own when you ask for an SEO audit.

**With the `skills` CLI** (also installs for other agents):

```bash
npx skills add OWNER/REPO --skill seo-geo-audit
```

**By hand:** copy the skill folder into your personal skills directory, then restart Claude Code.

```bash
cp -r plugins/seo-geo-audit/skills/seo-geo-audit ~/.claude/skills/
```

The skill's scripts need Node 18 or later.

## Use

In Claude Code, inside the project to audit, ask for an SEO audit, an AI-visibility (GEO) plan, an analytics plan or IndexNow, or invoke the skill directly. The plans are written in the project's language.

## Layout

```
.claude-plugin/marketplace.json     the marketplace: lists the plugins
plugins/<plugin>/
  .claude-plugin/plugin.json        plugin manifest (name, version)
  skills/<skill>/SKILL.md           the skill, its references/ and scripts/
  CHANGELOG.md
tests/<plugin>/                     test projects, not shipped with the plugin
```

Check the manifests before publishing:

```bash
claude plugin validate --strict .
claude plugin validate --strict plugins/seo-geo-audit
```

## Tests

Each plugin can have test projects in `tests/<plugin>/`, outside the plugin folder so they are not installed with it. For `seo-geo-audit`:

```bash
node tests/seo-geo-audit/run-script-tests.mjs
```

See [`tests/seo-geo-audit/README.md`](tests/seo-geo-audit/README.md) for the full-audit runs.

## Freshness

Search engines, AI crawlers and consent rules change often. Each skill states the date its facts were last checked, and tells the model to re-check them at the official source before relying on them. See [`plugins/seo-geo-audit/CHANGELOG.md`](plugins/seo-geo-audit/CHANGELOG.md).

## License

MIT, see [LICENSE](LICENSE). This is not legal advice: consent and privacy sections must be confirmed for your jurisdiction.
