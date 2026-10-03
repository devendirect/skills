# Output format

Every audit writes the same files, in the same shape, so two audits can be compared and a later run can update them. Translate the headings and labels into the project's language; keep the structure.

## Files

```
<plans folder>/
  00-summary.md
  <technical-seo>.md
  <ai-visibility>.md
  <analytics>.md
  <indexnow>.md            (if applicable)
  <programmatic-seo>.md    (if applicable)
```

**`00-summary.md` keeps this exact name in every language**, so a later run and other tools always find it. The plan files are named in the project's language (e.g. `seo-technique.md`, `visibilite-ia.md`, `mesure-audience.md` for a French project).

## Checkboxes: what `[x]` means

A checkbox is always an **action**. `[x]` means "this is in place and verified", never "this problem was observed".

- Good: `- [x] Self-referencing canonical on every page — *proof: check-live.mjs, 2026-10-03*`
- Wrong: `- [x] GA4 loads before consent — *proof: footer.php*`. That is a problem, not something done. Write it as a **Finding**, and the fix as an unticked action: `- [ ] Load GA4 only after consent`.

Observed problems go in the block's **Finding** line, with their proof.

## Ratings

| Impact | Meaning |
| --- | --- |
| **H** | Blocks indexing or citation, or affects every page (noindex in production, empty HTML, search agents blocked, missing consent) |
| **M** | Clear gain on an important page template or a whole channel |
| **L** | Polish, or a speculative lever |

| Effort | Meaning |
| --- | --- |
| **S** | Under an hour, one file or one console setting |
| **M** | Half a day to a day, a few files or a new component |
| **L** | Several days, a new feature or a data pipeline |

Order blocks by impact first, then by effort: H/S before H/M before M/S… A speculative lever is always **L** impact, whatever its effort.

## Plan file template

```markdown
# <Plan title> — <project name>

- **Audit date:** YYYY-MM-DD
- **Scope:** <local code / live site <domain> / both>; <what was not covered>
- **Facts checked against sources on:** YYYY-MM-DD
- **Legend:** [x] in place and verified, with proof in italics · [ ] to do · *(unverified)* could not be checked · *(to verify after deployment)*

## 1. <Block title> — impact H · effort S

**Finding:** <what is wrong or missing, and why it matters> — *proof: <file:line, script output, HTTP status, header>*

**Code**
- [ ] <action> (`path/to/file`)
- [x] <part of the fix already in place> — *proof: <file, HTTP status, header, commit>*

**Manual**
- [ ] <action in an external console>

**Done when:** <how to check it, e.g. `curl -sI <url>` returns 200 without `X-Robots-Tag: noindex`>

## 2. <Next block> — impact M · effort S
...
```

Rules:

- One block = one coherent change that can be implemented and checked on its own.
- Every block ends with **Done when**: a check anyone can run.
- No empty sections: if a block has no manual action, drop the **Manual** heading.
- A user decision is a block of its own, titled as a question, with the options, the trade-off and the recommendation.

## `00-summary.md` template

Same file name in every language; headings translated.

```markdown
# SEO / GEO audit — <project name>

- **Audit date:** YYYY-MM-DD
- **Scope:** <local / live / both>
- **Overall:** <one sentence: the state of the site and the single most important thing to do>

## Top 5 actions

| # | Action | Plan | Impact | Effort |
| --- | --- | --- | --- | --- |
| 1 | | [<plan>](<file>.md#<anchor>) | H | S |

## Decisions for you

- **<Question>** — options: <A> / <B>. Recommendation: <A>, because <reason>. (→ [<plan>](<file>.md#<anchor>))

## Already in place

- <what was verified as done, one line each>

## Not verified

- <item> — <why: site not deployed, source unreachable, needs console access…>

## Plans

- [<plan title>](<file>.md) — <number> blocks, <number> high impact
```

If the site is healthy, say it in **Overall** and keep the top 5 short: fewer than five real actions is a valid result.
