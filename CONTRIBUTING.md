# CONTRIBUTING to ShareSkippy 🐾

Thank you for your interest in contributing to **ShareSkippy**, the community-based platform for dog care. This guide covers the process, standards, and workflow for making code changes.

---

## ⚙️ Development Environment

All contributors must follow the [Local Development Setup steps in the `README.md`](#) to get the project running. This typically includes: **Node.js 20.x**, **Supabase**, and **Taskfile**.

**Verification Step**
Always run the validation commands before creating a Pull Request to ensure all checks pass:

```bash
npm run test
npm run lint
npm run build
```

---

## 📝 Code Standards & Conventions

We maintain a high standard of quality to ensure the platform is secure, reliable, and easy to maintain.

### 1. Code Quality

- The project uses **TypeScript** and runs under **strict mode**. New code must be fully typed.
- Code is automatically formatted using **Prettier** and must pass all linting checks.
- **Security and Safety** are paramount; ensure all changes are reviewed for potential community trust or data security issues.

### 2. Technology & Style

- **Next.js:** Components should leverage Server Components by default. Use the `'use client'` directive sparingly, only when interactive features are strictly necessary. Minimize client-side rendering.
- **UI Components:** Reuse existing components found in the `components/ui/` directory (e.g., `Button.js`, `Icon.js`) to maintain visual consistency.
- **API Routes:** All API endpoints must use Next.js **Route Handlers** (`app/api/`).
- **Database:** Changes to the Supabase (PostgreSQL) schema should be introduced via proper **Supabase Migrations**.

---

## ➡️ Pull Request Workflow

All contributions must follow a clear, documented process for integration into the `main` branch.

### 1. Branching

- **Never** commit directly to the `main` branch.
- Create a new, specific branch for your feature or fix (e.g., `feat/add-new-feature`, `fix/message-bug`).
- Pull the latest changes from `main` regularly to avoid merge conflicts.

### 2. Committing

- Keep commits **small and focused**, with each commit representing a single logical, reversible change.
- Write clear commit messages that explain _what_ you did, following the **Conventional Commits** specification.
  - _Examples:_ `feat: implement community filtering by distance`, `fix: resolve hydration warning on profile page`, `refactor: optimize data fetching in useProfile hook`.

### 3. Submission and Review

1.  Ensure all checks pass by running validation commands.
2.  Open a Pull Request (PR) targeting the `main` branch.
3.  The PR description **must** clearly document:
    - What was changed.
    - Why the change was needed (link to an issue or project goal).
    - How the changes can be tested (include screenshots/videos for visual updates).
4.  **A code review is mandatory** before a merge can occur. Request a review from Kaia or a maintainer.
5.  Perform manual inspection and e2e tests of the preview deployment.
6.  **Poduction Deployment** is restricted to the owner (`Kaia`) after the review is complete and approved.
