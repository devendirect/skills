# Update mode

Re-check existing plans instead of writing new ones. The plans are the user's working documents by now: they may have added notes, ticked boxes, or made decisions. Keep their structure and their words.

## Steps

1. **Read every file** in the plans folder, starting with `00-summary.md`. Note the previous audit date, the scope, the decisions already taken (a decision block with an answer written in it, or a choice mentioned in a note).
2. **Re-run the checks** of Phase 2 (and Phase 1 for local code), with the same scope as before unless the user asked otherwise.
3. **Go through every action**, ticked or not:

   | Before | Now | What to write |
   | --- | --- | --- |
   | `[ ]` | done, with proof | `[x]`, proof in italics, `— done, checked YYYY-MM-DD` |
   | `[ ]` | still to do | leave as is |
   | `[ ]` | partly done | leave unticked, add `— in progress (YYYY-MM-DD): <what is left>` |
   | `[x]` | still true | leave as is; refresh the date only if you re-checked it |
   | `[x]` | **no longer true** | untick it, add `— **regression** (YYYY-MM-DD): <proof>`, and raise the block's impact if the regression warrants it |
   | `[ ]` | no longer relevant (page removed, decision taken the other way) | strike it through (`~~…~~`) with the reason, do not delete it |

   The user's ticks are claims too: re-check them like the others. If a tick cannot be checked (console access, server config), leave it and mark it *(not re-checked: <why>)*.
4. **New findings** (a problem that was not there, or was missed) go in **new blocks at the end** of the relevant plan, numbered after the last block, marked `— new (YYYY-MM-DD)` in the title. Do not renumber existing blocks: the user and other files may refer to them.
5. **A block whose actions are all done** stays in place, with `— done (YYYY-MM-DD)` added to its title.
6. **Update each plan's header**: keep the original audit date, add `- **Updated:** YYYY-MM-DD`.
7. **Rewrite `00-summary.md`'s top 5** from what is still open, add a **Changes since the last audit** section (done, regressions, new findings, each with a link), and update **Not verified**.

## Never

- Delete or rewrite the user's notes, answers to decisions, or comments. Add next to them.
- Reopen a decision the user already took, unless a fact changed; then say which fact and ask.
- Rewrite a plan from scratch because the format changed. Adapt only what you touch.
- Tick something because the user said it was done, without checking it.

## `00-summary.md` addition

```markdown
## Changes since the last audit (<previous date> → <today>)

- **Done:** <action> ([plan](file.md#anchor)), …
- **Regressions:** <action>: <what changed> ([plan](file.md#anchor))
- **New:** <finding> ([plan](file.md#anchor))
- **Still open from the previous top 5:** …
```
