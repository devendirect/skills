# Plan: programmatic SEO

Only when the project has structured data that can be declined into pages (entities, categories, periods, places, combinations). Two steps: find real demand, then build the page matrix. The guardrails are not optional.

## 1. Find real demand

There is no reliable public API for Google Trends or search volumes: do not promise one.

- **Google autocomplete**: query the domain's root keywords with prefix / suffix variations. It shows what people really type. It is an undocumented, rate-limited endpoint, not an official API: keep requests few and slow, and say so in the plan.
- **Search Console** (if linked): queries with impressions but no clicks point to missing pages. Ask the user for an export if there is no access.
- **Bing Webmaster Tools**: keyword research with volumes, free.
- **Web search**: seasonality and emerging topics in the domain.
- Cross with the data axes the project already has: only propose pages whose content can be generated from existing data.

## 2. Build the page matrix

Template × axes (type × period, category × filter, entity × intent…). For each page family: the URL pattern, the target query, the data source, the estimated number of pages. Prioritize by discovered demand / generation cost.

## 3. Guardrails (in every plan, non-negotiable)

These separate programmatic SEO from what Google's spam policies call scaled content abuse:

- A minimum content threshold per page; below it, 404 or noindex, never a near-empty indexable page.
- noindex on pages with forecast or changing content (future dates, drafts).
- Systematic canonicals; never two URLs for the same content.
- Generated titles and descriptions that are **varied and specific** (data injected), not one template repeated word for word.
- Internal linking: every generated page linked from a hub, and linking to its neighbors (previous / next period, sibling categories).
- Selective sitemap (indexable pages only). Pre-render only the hot pages, the rest on demand (ISR or equivalent) so the build does not explode.
- **Every page answers a question a human actually asks.** If you cannot write the target query, the page should not exist.
