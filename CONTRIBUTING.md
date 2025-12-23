# CONTRIBUTING to ShareSkippy 🐾

Thanks for contributing to **ShareSkippy**! This document covers the expectations, workflow, and quality checks we follow so contributions stay reliable and secure.

## Development environment

- Follow the **Local development setup** steps in `README.md`, which rely on Node.js 20.x, `npm`, Supabase, Resend, and the Taskfile workflow (`task dev`).
- The Taskfile scripts wire together `npx supabase start`, `.env.local` population, and `npm run dev`, so you can focus on building instead of wiring infrastructure.

## Verification commands

Run these before opening a PR to keep CI green:

```bash
npm run lint
npm run test
npm run build
```

Optionally reset the local database when migrations change:

```bash
task db:reset
```

## Code standards & expectations

- **TypeScript-first:** All new logic should be typed without using `any` unless there is a strong, documented reason. Prefer interfaces, discriminated unions, and `Record` where appropriate.
- **Hooks & composition:** Use React hooks (`useMemo`, `useCallback`, custom hooks) to keep components modular. Avoid class components and deep prop drilling.
- **API routes:** Implement server logic with Next.js Route Handlers under `app/api/`.
- **Security:** Validate external inputs, avoid inline SQL, sanitize data before rendering, and document any assumptions in TSDoc.
- **Comments:** Use TSDoc-style comments for exported helpers and components. Only explain _why_ something exists, not _what_ it does if that's obvious.

## Workflow

1. **Branching**

- Never commit directly to `main`. Create descriptive branches (e.g., `feat/add-location-filter`).
- Keep your branch up to date with `main` to reduce merge conflicts.

2. **Committing**

- Make focused commits with clear intent, ideally one change per commit.
- Follow Conventional Commits for clarity (e.g., `fix: prevent null profile crash`).

3. **Pull requests**

- Target `main` and describe:
  - What changed
  - Why the change is needed (reference issues or goals)
  - How to test (include steps or screenshots when relevant)
- Wait for at least one maintainer review before merging.
- Testing the preview deployment before merge is encouraged.
- Production deployments are restricted to the repository owner after approval.
- Keep PRs small and focused on a single change.
- PR titles must follow Conventional Commits using one of the allowed types (`feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`), for example: `fix: prevent null profile crash`.

## Support resources

- `README.md` has the latest setup instructions, Taskfile workflow, and cron guidance (`scripts/setup-deletion-cron.sh`).
- Reach out to the maintainers for questions about policy, architecture, or credentials.
