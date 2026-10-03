# Structured data (JSON-LD)

Check each type against its page in Google's search gallery *(verify)*: required vs recommended fields change, and some rich results were restricted or retired.

## Checks for every block

- Valid JSON, correct `@context` and `@type`.
- Required fields present; recommended fields listed as gaps only if the data exists. **Before calling a field unavailable, check whether the data already exists** in the project or its upstream API.
- The markup matches the visible content. Never make the markup say more than the data guarantees (e.g. a "release date" is not a "date added to catalog").
- `</script>` escaped inside JSON-LD: serialize with `.replace(/</g, "\\u003c")` or the stack's equivalent.
- One source of truth: no duplicate blocks from a theme and a plugin.

## Known traps

| Type | Trap |
| --- | --- |
| `FAQPage` | Since 2023-09-14, FAQ rich results are only shown for well-known, authoritative government and health sites. A visible FAQ is still useful (it gives assistants quotable answers), and the markup is harmless, but **do not promise a rich result** for other sites. |
| `HowTo` | Rich result retired: do not promise one. |
| `aggregateRating` / `Review` | Needs `ratingValue` + `ratingCount` or `reviewCount`; explicit `bestRating` / `worstRating` if the scale is not 1–5. Self-serving reviews (a business rating itself on `LocalBusiness` / `Organization`) are not eligible. |
| `Product` | Price and availability must match the page. |
| `Article` | `datePublished` / `dateModified` in ISO 8601 with timezone; author as a `Person` or `Organization` with a name. |
| `Organization` / `WebSite` | Usually on the home page only, not repeated with different data on every page. |

## In the plan

Give, per page template: the current types, missing required fields, worthwhile recommended fields (and where the data comes from), and the Rich Results Test link for a human to confirm.
