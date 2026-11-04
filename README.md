# robotzade.az - complete offline mirror

A static capture of https://robotzade.az (Azerbaijani robotics / 3D-printing shop running on
the T-Soft e-commerce platform). **3,363 shop HTML pages** and every CSS, JS, image and font
they reference, rewritten to relative local paths, so the whole store opens with no network.

**Open `robotzade.az/index.html`** to browse it.

Want to just look at it in a browser? The rendered slice is hosted at
https://eldar-test-web.github.io/robotzade-preview/

## What is in here

| | |
|---|---|
| Shop pages (`robotzade.az/`) | 3,363 HTML files, 1,355 MB |
| Shop CDN assets (`robotzade.tsoftstatic.com/`) | 378 MB |
| Other T-Soft/boxcdn hosts | 42 MB |
| Total | 1,775 MB in 16,565 files |
| Largest single file | under 50 MB |

Every page is a real captured document, not a redirect or a stub: the homepage is 680 KB, a
category page ~380 KB, a product page ~400 KB. T-Soft inlines most of its CSS/JS per page,
which is why HTML is 76% of the weight and images only 20%.

## How it was made

1. `mirror.mjs` walks the sitemap (3,034 products, 246 categories, 38 pages, 11 brands, blog
   and campaigns), fetches each URL, refuses to save any Cloudflare error body, and rewrites
   every reference to a local relative path. It resumes from a `.done.txt` ledger, so it can be
   stopped and restarted without re-downloading.
2. `gap-report.mjs` then re-reads the finished tree and lists every reference that still points
   at a file that was never captured. Running the crawler over that list removed **43,611 -> 2,413**
   missing shop files (99.90% closed).
3. `make-lean.mjs` builds this repo from the raw mirror (4,013 MB / 26,534 shop-owned files):
   it drops 8,925 files belonging to vendor sites the shop merely links to, removes 9,969
   byte-identical image copies (-624 MB) and re-encodes 7,733 heavy PNG/JPG to WebP q80.
   Source tree is left untouched; `.gitattributes` sets `* -text` so git converts no bytes.
4. `preview.mjs` carves the hosted slice out of this tree.

## Known gaps - read before judging fidelity

- **~1,277 pages are missing.** The storefront returns `HTTP 520` for heavy product pages in
  bursts while light URLs (homepage, CSS, images) keep answering 200, so those page requests
  were deferred and never landed. Assets are complete; a tail of pages is not.
- **29,397 of 2,417,258 local references (1.22%) point at a file that was never captured.**
  These are mostly third-party destinations (vendor datasheets, blog links) that the shop only
  links out to. A handful of a few percent of product photos are also absent for the same 520
  reason. Broken links do not change the layout of the pages that are present.
- Cart, login, search results and checkout are **static snapshots**. Nothing here submits an
  order, takes payment or logs in; those flows need the live T-Soft backend.

## This is not the store

It is a mirror of someone else's shop, published for study. Prices, stock and images belong to
robotzade.az. Do not present it as their site.

## Rebuild

```bash
node mirror.mjs --out ./capture --concurrency 3 --delay 500 --asset-concurrency 6
node gap-report.mjs            # writes the still-missing URLs
node make-lean.mjs             # -> ./robotzade-lean (this repo)
node preview.mjs --max-pages 400 --max-mb 380
```

Requires Node 22 and ffmpeg on PATH for the WebP step.
