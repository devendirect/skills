# 03 — WordPress left in noindex (French)

A French WordPress site with a home-made theme and no SEO plugin, migrated from staging in September 2026. Every page sends `<meta name='robots' content='noindex, nofollow' />`: the "Discourage search engines from indexing this site" setting (Réglages → Lecture) was left on. With that setting, WordPress also disables its core sitemap, hence `/wp-sitemap.xml` answers 404. Google Analytics is hard-coded in `footer.php`, loading before any consent, for a French audience.

**Traps:** proposing to hand-code meta tags or JSON-LD in the theme, writing the plans in English, missing the consent problem, or treating the missing sitemap as a separate problem.

## Must

- [ ] Write every plan in **French**, plan file names included (e.g. `seo-technique.md`, `visibilite-ia.md`, `mesure-audience.md`), in the site's register (vouvoiement). The summary keeps its fixed name, `00-summary.md`.
- [ ] Never tick `[x]` on an observed problem (e.g. "GA4 loads without consent"): problems go in the **Finding** line.
- [ ] Rate the noindex as the **first H** finding, with the proof (meta robots on every page checked) and the fix: **Réglages → Lecture → décocher « Demander aux moteurs de recherche de ne pas indexer ce site »**, not a code change.
- [ ] Link the missing `/wp-sitemap.xml` to that same setting (core sitemaps are disabled while it is on), and check it again after the fix.
- [ ] Analytics: GA4 loads before consent for a French audience → **H**, CNIL. Present both options (banner + conditional loading with Consent Mode, or an exempt tool configured per CNIL conditions). Point out that the tag is hard-coded in `footer.php`.
- [ ] Recommend an SEO plugin (or the theme) for descriptions, canonical on the home page, Open Graph and `LocalBusiness`, **instead of** hand-written tags; warn against duplicates once a plugin is installed.
- [ ] Local business: suggest `LocalBusiness` data (address, phone, opening hours on Saturday) and a Google Business Profile as a manual action, consistent with the footer.

## Must not

- [ ] Write the plans in English.
- [ ] Propose editing `header.php` to add meta tags or JSON-LD by hand while recommending a plugin at the same time.
- [ ] Tick "sitemap" or "indexable" as done.
- [ ] Miss the consent problem.
- [ ] Implement anything, including unticking the setting.
