# 08 – Error handling & logging

Status: Reviewed API error patterns and logging; no behavior changes.

## Findings

- Widespread use of `console.log` / `console.error` across client pages and API routes for debugging.
- Error responses vary by route; not all return a consistent JSON envelope.

## Standardization proposal (documented, not applied)

- Error envelope shape:
  - `{ ok: false, error: { code: string, message: string } }`
  - Success envelope: `{ ok: true, data: ... }`
- Centralize logging via an internal logger util that redacts PII when logging request bodies or emails.

## Manual QA note

- No runtime edits were made; this documents recommended stabilization work to be done in-place without changing copy.
