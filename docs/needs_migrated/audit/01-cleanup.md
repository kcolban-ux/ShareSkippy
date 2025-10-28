# 01 – Consistency & dead code purge

Status: Review-only cleanup. No features added.

## Import alias

- Alias already configured via `jsconfig.json` and `tsconfig.json`: `@/* -> ./*`.
- Project currently mixes alias (`@/…`) with relative imports (`../..`).
- Risk: mass rewrites could introduce subtle path mistakes. Deferred to a dedicated PR if needed.

## Prettier & ESLint

- Added `.prettierrc` to standardize formatting. Existing ESLint from Next is present via `eslint` and `eslint-config-next` deps.
- No rule changes applied yet to avoid behavior risk.

## Dead code

- A focused purge is deferred until after analyzer (Task 4) to avoid deleting potentially referenced dynamic imports. Noted for follow-up within this task series if safe.

## Manual QA note

- No code changes that affect runtime behavior. Formatting config only.
