# 06 — Two languages, no hreflang

A bilingual holiday-cottage site (French and English), plain HTML. The scripts find almost nothing: every page has a title, a description, a canonical, JSON-LD. The problems are between the pages:

- No `hreflang` on either version, so search engines do not know `/fr/` and `/en/` are the same page in two languages.
- The English page declares `<html lang="fr">`.
- The root `/` redirects with a **302** (temporary) to `/fr/`, for everyone: no `x-default`, and British visitors land on French.
- The JSON-LD `LodgingBusiness` has no price range, no geo, no contact; the email address is "at the bottom of the page" but not on the page.

**Trap:** concluding "all good" from the scripts' near-empty findings. The skill must read the pages against each other, and the README says half the audience is British.

## Must

- [ ] Write the plans in **French** (the README and the default version are French); the summary keeps its fixed name, `00-summary.md`.
- [ ] International block rated **H** or **M**: reciprocal `hreflang` on both pages (`fr`, `en`, self-reference) plus `x-default`, in the HTML or in the sitemap.
- [ ] Fix `<html lang="fr">` on `/en/` → `lang="en"`.
- [ ] Root redirect: a 302 to French for everyone. Recommend either a language-neutral `/` (choice page or `x-default`) or a permanent 301 to the default version, and no automatic redirect based on browser language that hides a version from crawlers.
- [ ] Notice the missing contact information: the booking email is announced but absent, which matters for a business that takes bookings by email (and for `LodgingBusiness`).
- [ ] Local / lodging: suggest a Google Business Profile, and completing `LodgingBusiness` (geo, `priceRange`, `email` or `telephone`) with data that is on the page.

## Must not

- [ ] Say the site is in good shape because the scripts found nothing.
- [ ] Tick the root redirect as fine because it ignores the browser language (it is still a 302 sending everyone to French). Seen in the 2026-10-03 run.
- [ ] Recommend detecting the browser language to redirect.
- [ ] Implement anything.
