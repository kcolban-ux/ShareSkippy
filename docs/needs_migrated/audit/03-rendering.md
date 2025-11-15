# 03 – Rendering strategy

Status: Documented current RSC/Client usage and caching; no behavior changes.

## Findings

- Many routes and components declare `use client`, including top-level pages:
  - `app/page.js`, `app/profile/page.js`, `app/messages/page.js`, `app/signin/page.js`, `app/meetings/page.js`, `app/my-dogs/*`, `app/community/*`, `app/faq/page.js`, `app/safety/page.js`.
- API routes set `export const dynamic = 'force-dynamic'` in several review-related handlers (no change needed).

## Opportunities (documented, not applied)

- Some pages may not require client mode. Safe conversions would require verifying hooks/state/contexts used within them. Deferred to avoid risk.
- Unnecessary `useEffect` removal candidates exist but need per-file validation to ensure no side effects are relied upon.

## Manual QA note

- No code edits in this task. Pure documentation.
