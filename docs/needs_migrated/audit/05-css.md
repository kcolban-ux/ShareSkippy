# 05 – CSS/Tailwind tidy

Status: Reviewed Tailwind config and global styles; no behavior changes.

## Purge/content paths

- `tailwind.config.js` content includes:
  - `./app/**/*.{js,ts,jsx,tsx,mdx}`
  - `./pages/**/*.{js,ts,jsx,tsx,mdx}` (no `pages/` directory present; harmless)
  - `./components/**/*.{js,ts,jsx,tsx,mdx}`
  - `./styles/globals.css` (project uses `app/globals.css`)

Note: Consider updating content paths to reflect actual files (`app/globals.css`) for clarity. Deferred to avoid unnecessary churn.

## Tokens/themes

- DaisyUI themes enabled: `light`, `dark`.
- Custom utilities present (animations, gradients). No unused token sets detected at config level.

## Global styles

- `app/globals.css` heavily enforces white backgrounds and form control overrides—consistent with project requirements.
- No conflicting base resets observed.

## Opportunities (documented, not applied)

- Align `tailwind.config.js` content paths with existing structure (replace `styles/globals.css` with `app/globals.css`; optional removal of unused `pages/**`).
- Consider consolidating repeated checkbox override rules to reduce CSS size while preserving behavior.

## Manual QA note

- No CSS changes made; documentation only.
