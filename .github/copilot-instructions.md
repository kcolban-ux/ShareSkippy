# GitHub Copilot Instructions for `kcolban-ux/ShareSkippy`

These instructions guide AI coding assistants (like GitHub Copilot / Copilot Chat) when working in this repository. They are **requirements**, not suggestions.

---

## 1. General Principles

- Prefer **TypeScript over JavaScript** for all application logic.
- Default to **safe, defensive, and maintainable** code.
- Follow **idiomatic React / Next.js** patterns (functional components, hooks, composition).
- Prefer **small, focused modules** over monolithic files.
- Be **inclusive and clear** in naming and documentation; avoid jargon, slang, or non-inclusive terms.
- **Operate only on tracked project code**:
  - Do **not** propose changes to files or paths that are ignored via `.gitignore` or otherwise clearly labeled as generated, build artifacts, local environment files, or editor/OS cache files.
  - Treat `.gitignore` as a hard boundary: do not add, remove, or refactor code in ignored locations; do not suggest moving core code into ignored paths.

If any requirement conflicts with an existing pattern in the repo, prefer **the stricter / safer requirement**, but try to **adapt to existing architecture and naming conventions** where possible.

---

## 2. JavaScript → TypeScript Migration

Whenever you **touch or substantially modify** a JavaScript file (`*.js` / `*.jsx`):

1. **Migrate it to TypeScript**:
   - For React components, use `*.tsx`.
   - For non-JSX modules, use `*.ts`.
   - Update import paths across the repo if the file extension changes.

2. **Add appropriate types**:
   - Avoid `any` unless absolutely necessary; prefer:
     - `unknown` for untrusted input
     - `string`, `number`, `boolean`, `Record<...>`, discriminated unions, etc.
   - Define **interfaces or types** for props, state, and data models.
   - Use **enums or union types** instead of loose string literals where helpful.

3. **Keep the migration scoped and safe**:
   - Do **not** mix large refactors with migration; migrate in small, testable steps.
   - Preserve behavior; do not introduce breaking changes unless clearly required.

If a JavaScript file is only lightly touched (e.g., formatting or trivial fixes) and migration would be too large for the scope of the change, **raise a comment or TODO** indicating that it should be migrated to TypeScript soon.

---

## 3. TSDoc and Commenting Standards

For **all TypeScript files** (`*.ts`, `*.tsx`):

1. **Use TSDoc-style block comments** for:
   - Exported functions
   - Exported classes and class members
   - Public React components (pages, shared components, and reusable hooks)
   - Shared utilities and helpers

   Example:

   ```ts
   /**
    * Renders the user's profile summary card.
    *
    * @param props - Component props.
    * @returns A JSX element displaying the user profile summary.
    */
   export function UserProfileCard(props: UserProfileCardProps): JSX.Element {
     // ...
   }
   ```

2. Prefer **block-style comments** (`/** ... */` or `/* ... */`) for:
   - Documenting non-trivial logic
   - Explaining assumptions, edge cases, or performance considerations

3. Do **not** restate the obvious:
   - Comments should describe **why**, not just **what**.
   - Avoid redundant comments that simply repeat the function name or type.

4. Keep documentation **inclusive, neutral, and clear**:
   - Avoid gendered pronouns when generic (“they” is fine).
   - Avoid ableist or derogatory terms (e.g. “crazy”, “insane”).
   - Prefer professional, straightforward language.

---

## 4. React / Next.js Practices

When writing or modifying React / Next.js code:

1. **Use functional components and hooks**:
   - No class-based components.
   - Prefer `useState`, `useEffect`, `useMemo`, `useCallback`, etc., as appropriate.
   - Extract reusable logic into **custom hooks** instead of duplicating code.

2. **Component structure**:
   - Components should be:
     - **Small**: focused on a single responsibility.
     - **Composable**: build complex UIs from smaller components, not giant monoliths.
   - Avoid:
     - Components with extremely long files or functions.
     - Deeply nested logic in a single file; break out helpers.

3. **Data flow and state management**:
   - Prefer **lifting state** up appropriately and passing it down via props rather than using unnecessary global state.
   - Keep global state usage (e.g., context) **minimal and purposeful**.
   - Avoid prop drilling by extracting context only where it clearly improves clarity.

4. **Side effects and async logic**:
   - Place side effects in `useEffect` with correct dependency arrays.
   - Avoid memory leaks: clean up subscriptions, timers, and listeners.
   - Handle asynchronous calls with proper error handling and loading states.

5. **Routing and Next.js conventions** (if using Next.js):
   - Follow the existing directory conventions (`pages/`, `app/`, `api/`, etc.).
   - Use Next.js APIs (e.g., `getServerSideProps`, `getStaticProps`, server components) consistent with the existing codebase.
   - Prefer server-side or static rendering where it improves performance and user experience.

---

## 5. Security and Logic Auditing

For **all new or modified code**, perform a **security and logic review**:

1. **Validation and sanitization**:
   - Validate **all external inputs**:
     - Request bodies
     - Query parameters
     - Environment variables
     - User-generated content
   - Avoid trusting client-side data; re-validate on the server as necessary.

2. **Avoid injection vulnerabilities**:
   - Do not build SQL queries by string concatenation; prefer parameterized queries or ORM abstractions.
   - Avoid unsafe HTML injection. If using `dangerouslySetInnerHTML` or similar, ensure the content is sanitized and clearly document why it is safe.

3. **Authentication and authorization**:
   - Ensure protected actions verify both:
     - The user is authenticated.
     - The user is authorized to perform the action.
   - Never rely solely on client-side checks for security.

4. **Secrets and configuration**:
   - Never hard-code secrets, tokens, keys, or passwords.
   - Use environment variables and follow existing patterns for configuration.
   - Avoid logging sensitive data (tokens, passwords, personal user data).

5. **Error handling**:
   - Handle errors gracefully with clear messages and/or user feedback.
   - Avoid exposing internal implementation details or stack traces to end users.
   - Ensure errors are logged with enough context for debugging (without leaking secrets).

6. **Logic correctness**:
   - Consider edge cases (empty states, network failures, invalid data).
   - Avoid subtle bugs with:
     - Off-by-one errors
     - Incorrect null / undefined handling
     - Incorrect time zone / date handling
   - When in doubt, add tests (unit or integration) around critical logic.

---

## 6. Code Style, Structure, and Modularity

1. **No monolithic code**:
   - When adding new functionality, prefer multiple small modules over one large file.
   - Extract:
     - Reusable UI pieces into shared components
     - Reusable logic into hooks or utilities
     - Complex server logic into well-named helper functions or services

2. **Idiomatic, consistent style**:
   - Follow existing linting / formatting patterns (e.g., Prettier, ESLint) if present.
   - Use consistent naming:
     - PascalCase for components
     - camelCase for variables and functions
     - UPPER_SNAKE_CASE for constants and environment bindings

3. **Imports and exports**:
   - Prefer **named exports** for utilities and components unless there is a clear reason for a default export.
   - Avoid circular dependencies; refactor shared logic into separate modules if needed.

4. **Avoid unnecessary dependencies**:
   - Do not introduce a new library just for simple utility functionality that is easily implemented.
   - Prefer standard library and existing helper utilities in the repo where possible.

---

## 7. Tests and Reliability

When modifying or adding significant logic:

1. **Add or update tests**:
   - Prefer unit tests for pure logic.
   - Add integration tests for critical flows where feasible (e.g., API routes, key business logic).
   - Ensure tests are deterministic and do not depend on external network calls unless explicitly mocked or stubbed.

2. **Test coverage**:
   - When fixing a bug, add tests that **reproduce the bug** and validate the fix.
   - When adding new features, include tests for:
     - Happy paths
     - Common edge cases
     - Basic error handling

---

## 8. Database / PLpgSQL / Backend Logic

Because this repo includes **PLpgSQL**, treat any database-related changes with extra care:

1. **Query safety and performance**:
   - Use parameterized queries; do not concatenate user input into SQL strings.
   - Be mindful of performance: avoid N+1 query patterns and unnecessary full-table scans.

2. **Migrations and schema changes**:
   - Follow existing migration patterns (if applicable) when modifying schema.
   - Ensure migrations are:
     - Idempotent where possible
     - Safe for deployment (avoid long locks, destructive operations without backups)

3. **Data integrity and constraints**:
   - Respect existing constraints, indexes, and foreign keys.
   - When adding new constraints or fields, consider default values and backfill strategy.

---

## 9. Shell, PowerShell, and Tooling Scripts

For `*.sh` and `*.ps1` files:

1. **Safety**:
   - Avoid destructive commands (e.g., `rm -rf`) without clear safeguards.
   - Support dry-run or confirmation prompts where appropriate.

2. **Portability and clarity**:
   - Write scripts that are clear, commented, and straightforward to run.
   - Document any environment assumptions (OS, toolbox, required binaries).

3. **Security**:
   - Avoid embedding credentials or tokens.
   - Be explicit about any network interactions (e.g., curl, wget) and validate inputs or URLs.

---

## 10. Accessibility and UX Considerations

In UI changes:

1. **Accessibility**:
   - Use semantic HTML tags (`<button>`, `<nav>`, `<header>`, etc.) instead of generic `<div>`s.
   - Ensure interactive elements are keyboard accessible and properly labeled.
   - Provide `aria-` attributes where needed and alt text for images.

2. **Inclusive UX**:
   - Avoid language that could be exclusionary or insensitive.
   - Prefer neutral, descriptive labels and messages.

---

## 11. Documentation and Developer Experience

1. **Update documentation**:
   - When adding a new feature or changing behavior, update relevant docs (README, docs, comments) that describe:
     - Configuration changes
     - Usage changes
     - New scripts or commands

2. **Inline guidance**:
   - Use TSDoc and comments to highlight:
     - How to call a function or component correctly
     - Known caveats and limitations
     - Expected shapes of input and output data

3. **TODOs and follow-ups**:
   - If you must leave a known gap (e.g., untyped legacy area, missing test), add a **clear TODO** comment with a short explanation.
   - Avoid piling multiple concerns into a single PR: keep changes coherent and reviewable.

---

## 12. When in Doubt

If there is ambiguity in behavior, performance, or safety:

- Prefer the option that is:
  - Easier to maintain
  - Safer for users and data
  - Clearer for future contributors
- Add comments or TSDoc annotations explaining:
  - The decision taken
  - Any trade-offs or future improvements

If a choice involves security, privacy, or data integrity, **choose the safer option** and **document why**.

---
