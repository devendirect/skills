# Where SEO lives, by stack

Identify the stack from its files, then look in the right places. If the stack is not listed, find the equivalent of each column.

| Stack | How to recognize it | Titles / meta / canonical | Sitemap / robots | JSON-LD | Rendering for crawlers |
| --- | --- | --- | --- | --- | --- |
| **Next.js (App Router)** | `next` in package.json, `app/` | `metadata` / `generateMetadata` exports | `app/sitemap.ts`, `app/robots.ts` | `<script type="application/ld+json">` in the page | Server and client components are both pre-rendered on the server: `"use client"` does not hide content. But a `"use client"` page file cannot export `metadata` / `generateMetadata`: check that each route has its own metadata |
| **Next.js (Pages Router)** | `pages/` | `next/head` | Often a package (`next-sitemap`) or `public/` | Same | `getServerSideProps` / `getStaticProps` = SSR/SSG |
| **Nuxt** | `nuxt` in package.json | `useHead` / `useSeoMeta` | `@nuxtjs/sitemap`, `@nuxtjs/robots` | `useHead` script | `ssr: false` in config = client-only, a red flag |
| **Astro** | `astro` in package.json | Layout `<head>` | `@astrojs/sitemap`, `public/robots.txt` | Inline in the layout | Static by default |
| **SvelteKit** | `@sveltejs/kit` | `<svelte:head>` | Custom `+server.ts` routes | Inline | Check `export const ssr = false` |
| **SPA (Vite/React/Vue without SSR)** | `index.html` with an empty root div | Runtime only | `public/` | Runtime only | **Content not in served HTML**: AI crawlers see an empty page. Top priority finding. |
| **Plain PHP** | `.php` files, includes like `header.php` | The shared header include, often hardcoded | Static files or a `sitemap.php` | Echoed in the header include | Server-rendered by nature |
| **WordPress** | `wp-config.php`, `wp-content/` | SEO plugin (Yoast, Rank Math, SEOPress…) or the theme | Core sitemap `/wp-sitemap.xml` or the plugin's; robots is often virtual | Plugin-generated: audit it, don't duplicate it | Server-rendered; watch page builders and caching plugins |
| **Laravel** | `artisan`, `routes/web.php` | Blade layout, sometimes a package | Package (`spatie/laravel-sitemap`) or route | Blade | Server-rendered (Inertia/Livewire: check what is in the first HTML) |
| **Static HTML** | Only `.html` files | Each file | Files at the root | Inline | Fine |

## Environment variables inlined at build time

Public env variables (`NEXT_PUBLIC_*`, `VITE_*`, `NUXT_PUBLIC_*`, `PUBLIC_*` in Astro/SvelteKit) are baked into the bundle at build time. An analytics ID or site URL set only at runtime will be missing. Flag it in the plan.

## WordPress specifics

- Never propose hand-written JSON-LD or meta tags if an SEO plugin already outputs them: configure the plugin instead, or the site ends up with duplicates.
- "Discourage search engines from indexing this site" (Settings → Reading) is a classic leftover from staging: check it.
- Robots.txt is usually virtual: a physical `robots.txt` file overrides it.
