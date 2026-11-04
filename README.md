# robotzade.az — offline mirror

Unofficial offline copy of the **[robotzade.az](https://robotzade.az)** storefront (T-Soft platform),
crawled on **2026-11-04 / 2026-11-05**. All product names, texts, images and prices belong to
robotzade.az — this repository is an archive/study copy, not affiliated with or endorsed by them.

## Open it

```
robotzade.az/index.html        ← double-click, works with no internet
```

Every `href` / `src` / `srcset` / CSS `url()` was rewritten to a relative local path, so category
pages, product pages and the CDN assets resolve offline.

## What is inside

| host folder | what it holds |
|---|---|
| `robotzade.az/` | 1,333 pages of the storefront (products, categories, news, cart, search) |
| `robotzade.tsoftstatic.com/` | the shop's CSS/JS/image CDN |
| `robotzade.tsoft.biz/` | secondary shop host (search + category pages) |
| `www.robotzade.com/` | the brand's .com site |
| everything else | third-party pages/datasheets linked *from* product pages (pololu, ti, waveshare, seeedstudio, raspberrypi, adafruit, boxcdn …) |

Captured totals before any size reduction: **7,922 files / 1,434 MB / 1,348 HTML pages**.

## This copy is the "lean" build

| step | effect |
|---|---|
| content-hash dedupe of images | 1,694 identical copies removed (−158.9 MB), all references re-pointed to the surviving copy |
| PNG/JPG ≥ 30 KB re-encoded to WebP (quality 80, ffmpeg) | 2,261 images converted; CDN folder 779 MB → 116 MB |
| reference rewrite | 1,334 text files updated, 411,530 references mapped |
| result | **6,228 files / 748 MB** (from 1,434 MB) |

Small images (< 30 KB), SVG, GIF and CSS/JS are byte-for-byte untouched. `.gitattributes` sets
`* -text`, so git performs no line-ending or CRLF conversion on anything.

Integrity check over 969,385 local references: **24,097 (2.49%) point at files that were never
captured** — the untouched source mirror has exactly the same number, so the size reduction broke
nothing. Those are mostly lazy-load/thumbnail variants the shop did not serve.

## Known gaps

The storefront origin answers intermittently with **HTTP 520 from Cloudflare**, so roughly 2,174
URLs listed in the shop's own sitemaps are not in this copy. Pages are as-captured; nothing was
invented, filled in or re-typed.

## Rebuild it yourself

```bash
node mirror.mjs --origin https://robotzade.az --out ./mirror --seed-file ./seeds.txt
node make-lean.mjs          # mirror/ -> robotzade-lean/ (dedupe + WebP + ref rewrite)
node audit-refs.mjs ./mirror ./robotzade-lean   # compare reference integrity
```

Those scripts live next to this README in the source tree they were run from.
