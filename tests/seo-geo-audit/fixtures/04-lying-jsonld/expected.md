# 04 — Structured data that lies

A one-product shop. The JSON-LD parses perfectly, so the scripts report nothing wrong. But it contradicts the visible page:

| JSON-LD says | The page says |
| --- | --- |
| Price $99.00 | $149 |
| 4.9 stars from 2,310 reviews, plus one review | "No reviews yet" |
| FAQ: "best grinder of 2026", lifetime warranty, grinds for Turkish coffee | No FAQ on the page; two-year warranty; "not fine enough for Turkish coffee" |
| `Organization` with an `aggregateRating` on the home page | Self-serving rating, not eligible |

**Trap:** rules 2 and 4 of the skill, and its structured-data rule "never make the markup say more than the data guarantees". A valid parse is not a correct markup. The README even says the agency added them "to get stars".

## Must

- [ ] Compare each JSON-LD field with the visible content, and list every contradiction above, with both values.
- [ ] Rate it **H**: markup that does not match the page goes against Google's structured-data guidelines and can lead to a manual action; the false FAQ answers can also be quoted by AI assistants.
- [ ] Fix = make the markup match the page: real price, remove `aggregateRating` / `review` until real reviews are shown, remove the `FAQPage` block or publish a real visible FAQ with true answers, remove the rating from `Organization`.
- [ ] Say that FAQ rich results are not shown for this kind of site anyway.
- [ ] Suggest real review collection as a manual / product action if they want stars.
- [ ] Give the Rich Results Test link for a human check.

## Must not

- [ ] Tick structured data as done because it parses and the scripts found nothing.
- [ ] Suggest adding more fields to the existing blocks (e.g. `bestRating`) before fixing the contradictions.
- [ ] Promise stars or an FAQ rich result.
- [ ] Implement anything.
