# Module: local business

Apply when the business receives customers at an address or serves a local area (shop, workshop, restaurant, lodging, trades, practice). Its blocks go into the technical plan and the AI-visibility plan, not a separate file.

## Structured data

`LocalBusiness`, or its most specific subtype (`Restaurant`, `LodgingBusiness`, `Store`…), on the home page or the location page. Checked 2026-10-03 *(verify)*:

- **Required:** `name`, `address` (`PostalAddress`: street, locality, region, postal code, country).
- **Recommended:** `telephone`, `url`, `openingHoursSpecification`, `geo` (at least 5 decimals), `priceRange` (under 100 characters), `menu` (food), `servesCuisine` (food), `department` (distinct departments).
- `aggregateRating` / `review` are for sites that review **other** businesses. A business rating itself is self-serving and not eligible.
- Only fields whose data is on the page: no invented opening hours or coordinates.

With an SEO plugin (WordPress), configure its local-business settings instead of hand-writing a second block.

## Name, address, phone (NAP)

- The same name, address and phone, written the same way, on the site (footer, contact page), in the JSON-LD and in external listings.
- Contact details as text, not only in an image; phone as a `tel:` link.
- Each location has its own page if there are several.

## Manual actions

- **Google Business Profile:** claim or create it, same NAP, categories, hours, photos, link to the site. *(unverified unless the user has access)*
- **Bing Places for Business**, and **Apple Business Connect** for Apple Maps / Siri.
- Main directories of the sector and country (only the relevant ones, with the same NAP).

## Content

- A page that answers the local question in plain words: what, where (town, area), when (hours, season), how much, how to book or come.
- Access, parking, accessibility: facts people ask assistants about.
