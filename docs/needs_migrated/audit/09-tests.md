# 09 – Tests (stability only)

Status: Reviewed existing tests; no new tests added per review-only scope.

## Current tests in repo

- Root-level scripts present for targeted checks:
  - `test-account-recreation-prevention.js`
  - `test-api-endpoints.js`
  - `test-deletion-cancellation-flow.js`
  - `test-emails.js`

These appear to be custom Node scripts rather than a formal runner (e.g., Jest/Playwright). CI integration not detected.

## Gaps and recommendations (documented, not applied)

- Unit tests: Add minimal assertions for current exported utils (e.g., `libs/utils.js`, `libs/errorHandler.js`) using a lightweight runner.
- E2E happy paths (one each):
  - signup → welcome email test endpoint
  - create availability → request → accept → review (use existing API routes and seed where possible)
- Snapshots: Avoid unless deterministic and necessary.

## Manual QA note

- No new fixtures or flows proposed. Any addition should strictly exercise existing routes and UI paths.
