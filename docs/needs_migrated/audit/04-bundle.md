# 04 – Bundle weight

Status: Analyzer integrated (opt-in via `ANALYZE=true`). No behavior changes.

## Findings (from analyzer)

- Client first-load shared JS: ~86.5 kB
- Notable libraries in tree:
  - `@supabase/*` (chunked via custom split)
  - `react-hot-toast`
  - `daisyUI`/Tailwind (CSS, not JS-heavy but theme CSS present)

Build notes:

- Reports saved locally:
  - `.next/analyze/client.html`
  - `.next/analyze/nodejs.html`
  - `.next/analyze/edge.html`

Warnings observed (informational):

- Supabase packages reference Node APIs when evaluated in Edge runtime paths; currently warnings only.
- Missing `sharp` optional dependency for image optimization.

## Opportunities (documented, not applied)

- Confirm `optimizePackageImports` covers only used submodules (`@supabase/supabase-js`, `react-hot-toast`).
- Audit components importing large modules at top-level; consider narrowing imports.
- Consider adding `sharp` in production to improve image performance (no behavior change).

## Manual QA note

- No code paths changed. Analyzer is gated behind `ANALYZE=true` and only affects build reporting.
