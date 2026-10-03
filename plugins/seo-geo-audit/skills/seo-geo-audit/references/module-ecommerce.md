# Module: e-commerce

Apply when the site sells products with a price (own shop, not affiliate links). Its blocks go into the technical plan, or a separate `e-commerce` plan file if there are many.

## Product structured data

Two Google experiences, checked 2026-10-03 *(verify)*:

| | Product snippets | Merchant listings |
| --- | --- | --- |
| For | Pages about a product (reviews, comparisons, shops) | Pages where the site **sells** the product |
| Offer | `Offer` or `AggregateOffer` | `Offer` only (the site must be the seller), price **greater than zero** |
| Required (merchant listing) | — | `Product.name`, `Product.image`, `Product.offers`; `Offer.price` (or `priceSpecification.price`), `Offer.priceCurrency` (ISO 4217) |
| Worth adding | `aggregateRating` / `review` **only if visible on the page** | `description`, `brand`, `availability`, `shippingDetails`, `hasMerchantReturnPolicy`, identifiers (`gtin`, `mpn`, `sku`) |

- **Price, availability and reviews must match the page.** Markup that contradicts the visible content goes against Google's structured-data guidelines (see [`structured-data.md`](structured-data.md)).
- Shipping and return policies can also be set once in Merchant Center instead of on every page.

## Merchant Center (manual)

- Google Merchant Center account, product data from the structured data or a feed, free listings enabled. *(unverified unless the user has access)*
- The data in Merchant Center, the structured data and the page must agree on price and availability.

## Faceted navigation and listings

Filters and sorting multiply URLs (`?color=red&size=m&sort=price`). Google's guidance *(verify)*:

- If filtered URLs do not need to be found in search: block them in robots.txt, or use URL fragments (`#`) for filters, which crawlers ignore.
- If some must be indexed (e.g. a category × color page people search for): standard `&` parameter separators, a consistent parameter order, `rel="canonical"` to the preferred version, and a **404** when a combination has no result.
- Pagination: each page reachable through a real `<a href>` link; do not canonicalize page 2+ to page 1.

## Out of stock and discontinued products

- Temporarily out of stock: keep the page (200), `availability` = `OutOfStock`, show the restock date if known.
- Discontinued: 301 to the closest replacement or the category; otherwise 404 / 410. Not a redirect to the home page.

## Content

- Product pages with the facts buyers and assistants need: dimensions, materials, compatibility, what is in the box, warranty, shipping countries and delays, returns.
- A visible FAQ with true answers beats any markup.
