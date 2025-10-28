# 00 – Repo hygiene

Status: Review-only cleanup. No features added.

## Node & package manager

- Pinned Node via `.nvmrc`: `v20.11.1`
- Set `packageManager` in `package.json` to `npm@10.8.1`
- Added `engines.node: ^20.11.1` for CI consistency

## Scripts normalized

Existing: `dev`, `build`, `postbuild`, `start`, `lint`.
Added placeholders (no behavior change):

- `typecheck`: to be implemented in Task 2
- `test`: to be implemented in Task 9
- `analyze`: runs Next build with analyzer flag (wired in Task 4)

## Lockfiles

- Single lockfile present: `package-lock.json` (npm). No yarn/pnpm lockfiles found.

## CI / Actions

- No `.github` directory detected. Nothing to remove.

## Env keys

- `.env.example` referenced in README. Audit of actual env keys will happen during security task.

## Manual QA note

No runtime behavior changes. Local `npm run dev` and `npm run build` unaffected.
