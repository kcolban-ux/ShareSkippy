# Code Quality and Linting Rules

## Critical Linting Requirement

- **MANDATORY**: After making any code changes, you MUST run `npm run lint` to ensure no new linting errors have been introduced.
- Always fix any linting errors that are discovered before considering the task complete.
- The lint command checks both JavaScript/TypeScript (ESLint) and CSS (Stylelint) files.

## Workflow

1. Make code changes as requested
2. **IMMEDIATELY** run `npm run lint` to check for linting errors
3. If linting errors are found, fix them before marking the task as complete
4. Only proceed to other tasks once linting passes

## Linting Commands

- `npm run lint` - Run both ESLint and Stylelint checks
- `npm run lint:js` - Run ESLint only
- `npm run lint:css` - Run Stylelint only
- `npm run lint:fix` - Automatically fix linting errors where possible

