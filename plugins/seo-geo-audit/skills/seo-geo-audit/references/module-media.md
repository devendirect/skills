# Module: images and video

Apply when images or videos carry real content (portfolio, recipes, products, tutorials, news), not only decoration. Blocks go into the technical plan.

## Images

- **`alt` text** that describes the image in context; empty `alt=""` for purely decorative images. Not a list of keywords.
- Images in `<img>` (or `<picture>`) elements, not only CSS backgrounds, so they can be indexed.
- Descriptive file names and nearby text (caption, heading) that says what the image shows.
- `width` and `height` on every image (prevents layout shift, CLS); modern formats (WebP, AVIF) with sizes matched to the display; `loading="lazy"` on images **below** the fold only. The main (LCP) image is not lazy-loaded.
- **Image sitemap** (or `<image:image>` entries in the sitemap) when images are a goal in themselves (portfolio, stock, recipes).
- `max-image-preview:large` in the robots meta tag, if the owner wants large previews in search and Discover *(verify)*.
- An `og:image` per page for sharing (see the technical plan).

## Video

- **`VideoObject`** structured data on the page where the video can be watched. Checked 2026-10-03 *(verify)*:
  - **Required:** `name` (unique per video), `thumbnailUrl`, `uploadDate` (ISO 8601).
  - **Recommended:** `description`, `duration`, `contentUrl` (preferred) or `embedUrl`, `expires` if the video goes offline.
- A watch page per important video, where the video is the main content, with a text summary or transcript: assistants and search engines read text, not video.
- Videos hosted on a platform (YouTube, Vimeo): the embed still needs the page's own title, description and text; the platform page will often rank instead of the site's, which is a choice to make, not a bug.
- Video sitemap entries if the site hosts many videos *(verify)*.

## Checks

- `check-live.mjs` shows JSON-LD types: look for `ImageObject` / `VideoObject`.
- `render-compare.mjs` when images or players are injected by JavaScript.
- PageSpeed Insights for LCP and CLS caused by images.
