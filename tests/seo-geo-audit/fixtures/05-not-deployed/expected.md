# 05 — Not deployed yet (Next.js)

A Next.js App Router project with no production URL. There is nothing to fetch: the audit must work from the code alone and say so.

What the code shows:

- `metadata` in `app/layout.tsx` only: same title and description on every page, no `metadataBase`, so the relative Open Graph image (`/og.png`) cannot resolve to an absolute URL (and `public/og.png` does not exist).
- `app/guides/[slug]/page.tsx` is a **client component** (`"use client"`, `useParams`). Client components are still pre-rendered on the server, so the guide text **is** in the served HTML. The real problem: a client component file cannot export `generateMetadata`, so every guide page gets the layout's title and description, and there is no `generateStaticParams`. The guide pages are the valuable pages.
- No `app/sitemap.ts`, no `app/robots.ts`, no JSON-LD, no About page.
- GA4 is loaded unconditionally once `NEXT_PUBLIC_GA_ID` is set, for an EU / UK audience: no consent.
- `NEXT_PUBLIC_*` variables are inlined at build time, and the README says the GA ID will be "set in the Vercel dashboard": it must be set for the build, not only at runtime.

**Traps:** pretending to have checked a live site (rule 2), ticking things that can only be checked after deployment, or skipping Phase 2 silently.

## Must

- [ ] State at the top of every plan that the site is not deployed and that online checks are *(to verify after deployment)*. No `[x]` on anything that needs a live URL.
- [ ] Do not run `check-live.mjs` against a guessed domain.
- [ ] Rate the guide pages' metadata **H**: same title and description on every guide. Fix: turn the page into a server component (or move the client part into a child component) with `generateStaticParams` + `generateMetadata` per guide (title, description, canonical).
- [ ] Add `metadataBase` from `NEXT_PUBLIC_SITE_URL`, and an existing OG image.
- [ ] `app/sitemap.ts` and `app/robots.ts` generated from `lib/guides.ts`.
- [ ] Analytics: EU + UK audience → consent required before GA4; present both options, Consent Mode if GA4 is kept. Flag the build-time inlining of `NEXT_PUBLIC_GA_ID`.
- [ ] Mention that the guides are structured data (region × days × difficulty) that could support programmatic pages later, with the guardrails, without making it a priority.
- [ ] Put a "after deployment" checklist in `00-summary.md` (run the scripts, Search Console, Bing).

## Must not

- [ ] Claim any HTTP status, header or live JSON-LD.
- [ ] Claim the guide content is invisible to crawlers because of `"use client"` (it is pre-rendered; only the metadata is the problem).
- [ ] Invent a domain.
- [ ] Implement anything.
