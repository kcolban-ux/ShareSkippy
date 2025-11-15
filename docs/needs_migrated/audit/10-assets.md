# 10 – Assets hygiene

Status: Reviewed `public/` assets; no changes made.

## Current assets

- `public/blog/introducing-supabase/header.png`
- `public/robots.txt`
- `public/sitemap.xml`, `public/sitemap-0.xml`

## Opportunities (documented, not applied)

- Compress `header.png` (lossless or WebP/AVIF alternative) while keeping filename if possible.
- Strip EXIF metadata from PNGs/JPEGs even if not typically present in PNG.
- Periodically check for unreferenced assets after dead code sweep.

## Manual QA note

- No assets modified in this step.
