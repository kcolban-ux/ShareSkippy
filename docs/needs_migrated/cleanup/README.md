# ShareSkippy Codebase Cleanup

This directory contains documentation and plans for safely cleaning up the ShareSkippy codebase.

## Overview

This cleanup process follows a strict "read-first, prove-unused-first" approach to ensure no functionality is broken during the cleanup process.

## Files

- `audit.md` - Comprehensive audit of the codebase with evidence for all findings
- `changeset-plan.md` - Detailed plan for incremental cleanup via PRs
- `README.md` - This file with safety instructions

## Safety Checks

Before making any changes, always run these safety checks:

```bash
# Install dependencies
npm install

# Check TypeScript (if configured)
npm run typecheck

# Run linting
npm run lint

# Run tests (if configured)
npm test

# Build the project
npm run build
```

## Cleanup Principles

1. **No Behavior Changes** - Only remove unused code
2. **Evidence-Based** - Every deletion must have proof of non-usage
3. **Atomic Changes** - Each PR is small and reversible
4. **Safety First** - All changes validated before merge

## Phase 1: Read-Only Audit ✅

- [x] Analyze codebase structure
- [x] Identify unused files and components
- [x] Document email system (read-only)
- [x] Create audit documentation
- [x] Plan incremental changes

## Phase 2: Low-Risk Hygiene (PR 1-2)

- [ ] Fix critical TypeScript errors
- [ ] Remove unused variables
- [ ] Fix linting issues
- [ ] Remove unused components

## Phase 3: Safe Deletions (PR 3-5)

- [ ] Remove test/debug API routes
- [ ] Remove unused files
- [ ] Remove unused SQL migrations

## Phase 4: Optimizations (PR 6-7)

- [ ] Image optimization
- [ ] Package.json improvements
- [ ] Security updates

## What Must Stay Untouched

- Email system functions and triggers
- Database schema and RLS policies
- Authentication and user management
- Payment processing (Stripe)
- Public API contracts
- Environment variables

## Rollback Instructions

If any changes cause issues, use these commands to rollback:

```bash
# Rollback specific PR
git revert <commit-hash>

# Rollback to before cleanup
git reset --hard <commit-before-cleanup>

# Restore specific files
git checkout <commit-before-cleanup> -- <file-path>
```

## Success Metrics

- [ ] Build passes without errors
- [ ] All tests pass
- [ ] Linting errors reduced by 80%
- [ ] No unused code remains
- [ ] Performance improved
- [ ] Security vulnerabilities addressed

## Contact

For questions about this cleanup process, refer to the audit documentation or contact the development team.
