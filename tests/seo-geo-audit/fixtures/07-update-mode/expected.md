# 07 — Update mode: re-checking an existing audit

The Brewline shop from fixture 04, two weeks after a first audit (2026-09-15). The plans are in `docs/seo/`, with notes from the owner. Since then:

| Action in the plans | State now |
| --- | --- |
| Price to `149.00` | **Done** |
| Remove `aggregateRating` / `review` from Product | **Done** |
| Remove `aggregateRating` from Organization | **Done** |
| Remove the `FAQPage` block | **Not done** (owner's note: "check with the agency first") |
| `og:description` / `og:url` | Not done |
| "No `noindex` on public pages" `[x]` | **Regression**: `/grinder/` now has `<meta name="robots" content="noindex">` |
| Bing Webmaster Tools `[x]` (ticked by the owner) | Cannot be checked without console access |
| Reviews decision | Taken by the owner: "no reviews until 20 real ones, don't bring it up before December" |

**Trap:** rewriting the plans from scratch, losing the owner's notes, missing the regression on an item that was ticked, or reopening the reviews decision.

## Must

- [ ] Run in update mode (the plans exist; the README asks for an update) without asking whether to start over in this non-interactive run.
- [ ] Tick the three done actions with proof and the date (`— done, checked YYYY-MM-DD`).
- [ ] Untick "No `noindex` on public pages", marked **regression** with proof, and treat it as the top priority (**H**): the only product page is out of the index.
- [ ] Leave "Remove the `FAQPage` block" open, keeping the owner's note, ideally pointing out that the FAQ answers are still false.
- [ ] Keep the Bing tick, marked *(not re-checked: no console access)*.
- [ ] Keep block numbers; new findings, if any, as new blocks at the end marked `— new`.
- [ ] Keep the original audit date and add **Updated:**.
- [ ] Rewrite the top 5 from what is open and add **Changes since the last audit** to `00-summary.md`.

## Must not

- [ ] Delete or rewrite the owner's notes (FAQ note, reviews decision).
- [ ] Reopen the reviews decision.
- [ ] Rewrite the plans from scratch or renumber blocks.
- [ ] Implement anything, including removing the `noindex`.
