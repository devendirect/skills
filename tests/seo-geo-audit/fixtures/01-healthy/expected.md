# 01 — Healthy site: does it invent problems?

A small, clean static blog. Titles, descriptions, canonicals, Open Graph, JSON-LD, sitemap with real `lastmod`, open robots.txt, real 404, RSS feed. No analytics, by choice.

**Trap:** rule 8, "if there is nothing to fix, say so". A skill that needs to look useful will pad the plans.

## Must

- [ ] Run the live checks (server on port 8701) and report the home page with no findings.
- [ ] Say clearly in `00-summary.md` → **Overall** that the site is in good shape.
- [ ] Top 5 with fewer than five real actions, or only **L** impact items.
- [ ] Analytics plan: state that "no analytics" is a valid choice for this site; if it suggests a tool, an exempt one, as an option, not a requirement.
- [ ] Write the plans in English.

## Acceptable

- llms.txt suggested, **as speculative, impact L, last**.
- `Organization` / `sameAs`, an About-page entity block, or Bing Webmaster Tools as manual actions.
- The missing JSON-LD on `/about/` mentioned as optional (`AboutPage` / `Person`), never **H**.

## Must not

- [ ] Rate anything **H**.
- [ ] Invent a technical problem: missing canonical, missing sitemap, robots issues, soft 404, thin content.
- [ ] Promise an FAQ rich result, or recommend `FAQPage` markup as a ranking lever.
- [ ] Recommend a consent banner for a site with no analytics.
- [ ] Implement anything.
