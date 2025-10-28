# ShareSkippy Cleanup Changeset Plan

**Date:** 2024-12-19  
**Phase:** 1 - Planning Complete

## Overview

This plan outlines a safe, incremental cleanup of the ShareSkippy codebase. Each PR is atomic, reversible, and maintains 100% functionality.

## PR 1: Critical Fixes & Hygiene (No Deletions)

**Scope:** Fix critical build issues and code hygiene  
**Risk Level:** Low  
**User Impact:** None (internal fixes only)

### Changes:

1. **Fix TypeScript Error** (Critical)
   - File: `libs/email/reengage.ts:158`
   - Issue: Type error in Date constructor
   - Fix: Proper type casting for `user.user_activity.at`

2. **Remove Unused Variables**
   - `app/api/account/deletion-request/debug/route.js` - Remove `constraintError`, `afterError`
   - `app/api/admin/process-deletions/route.js` - Remove unused `request`
   - `app/api/community/events/[id]/join/route.js` - Remove `checkError`
   - `app/api/lead/route.js` - Remove unused `createClient`
   - `app/api/meetings/route.js` - Remove unused `request`
   - `app/api/meetings/update-status/route.js` - Remove unused `request`
   - `app/api/messages/route.js` - Remove `convError`
   - `app/api/profile/test/route.js` - Remove unused `request`
   - `app/api/reviews/pending/route.js` - Remove unused `request`
   - `app/api/test-availability/route.js` - Remove unused `request`
   - `app/api/test-resend/route.js` - Remove unused `resend`
   - `app/api/webhook/stripe/route.js` - Remove unused `webhookSecret`

3. **Fix Unescaped Entities**
   - `app/admin/layout.js:88` - Escape apostrophe
   - `app/community/availability/[id]/edit/page.js:885` - Escape apostrophe
   - `app/community/availability/[id]/page.js:843` - Escape apostrophe
   - `app/community/page.js:628` - Escape apostrophe
   - `app/community-guidelines/page.js` - Escape 4 apostrophes
   - `app/faq/page.js` - Escape 3 apostrophes
   - `app/how-to-use/page.tsx` - Escape 4 apostrophes

4. **Add Missing useEffect Dependencies**
   - `app/community/availability/[id]/edit/page.js:46` - Add `fetchAvailabilityDetails`
   - `app/community/availability/[id]/page.js:20` - Add `fetchAvailabilityDetails`

5. **Remove Unused Imports**
   - `app/community/layout.js` - Remove unused `redirect`, `config`
   - `app/community/page.js` - Remove unused variables

### Safety Checks:

```bash
npm install
npm run typecheck  # Should now pass
npm run lint       # Should have fewer errors
npm test           # Should still pass
npm run build      # Should now succeed
```

### Rollback:

```bash
git revert <commit-hash>
```

---

## PR 2: Unused Components Removal (Low Risk)

**Scope:** Remove unused components  
**Risk Level:** Low  
**User Impact:** None (unused components)

### Changes:

1. **Delete Unused Components**
   - `components/Testimonials1.js` - No imports found
   - `components/Testimonials11.js` - No imports found
   - `components/Testimonials3.js` - No imports found
   - `components/FeaturesAccordion.js` - No imports found
   - `components/FeaturesGrid.js` - No imports found
   - `components/FeaturesListicle.js` - No imports found
   - `components/FAQ.js` - No imports found

### Evidence:

- `grep -r "Testimonials1\|Testimonials11\|Testimonials3" .` - No matches
- `grep -r "FeaturesAccordion\|FeaturesGrid\|FeaturesListicle" .` - No matches
- `grep -r "import.*FAQ" .` - No matches

### Safety Checks:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

### Rollback:

```bash
git revert <commit-hash>
```

---

## PR 3: Test/Debug API Routes Removal (Low Risk)

**Scope:** Remove test and debug API routes  
**Risk Level:** Low  
**User Impact:** None (test routes only)

### Changes:

1. **Delete Test API Routes**
   - `app/api/test-resend/route.js` - Disabled test route
   - `app/api/test-availability/route.js` - Database test route
   - `app/api/profile/test/route.js` - Profile test route
   - `app/api/account/deletion-request/debug/route.js` - Debug route
   - `app/api/admin/test-bulk-email/route.js` - Email test route

### Evidence:

- All routes are test/debug only
- No production functionality
- Some already disabled

### Safety Checks:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

### Rollback:

```bash
git revert <commit-hash>
```

---

## PR 4: Unused Files Cleanup (Low Risk)

**Scope:** Remove unused root-level files  
**Risk Level:** Low  
**User Impact:** None (unused files)

### Changes:

1. **Delete Unused Files**
   - `next` - Binary file with no clear purpose
   - `shareskippy_magic_link_template.html` - Superseded by new email system
   - `example-email-usage.js` - Documentation file with no imports

2. **Delete Test Files**
   - `test-account-recreation-prevention.js`
   - `test-api-endpoint.js`
   - `test-api-endpoints.js`
   - `test-curl-commands.sh`
   - `test-deletion-cancellation-flow.js`
   - `test-dmarc-update.sh`
   - `test-emails.js`
   - `test-main-domain-email.sh`
   - `test-reengagement-simple.js`

### Evidence:

- No imports found for any of these files
- Test files are not part of production build
- Documentation files are not referenced

### Safety Checks:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

### Rollback:

```bash
git revert <commit-hash>
```

---

## PR 5: SQL Migration Files Cleanup (Low Risk)

**Scope:** Remove unused SQL migration files  
**Risk Level:** Low  
**User Impact:** None (already applied migrations)

### Changes:

1. **Delete Unused SQL Files**
   - `add_can_pick_up_drop_off_migration.sql`
   - `add_dog_ids_to_meetings.sql`
   - `apply_migration.sql`
   - `availability_migration.sql`
   - `comprehensive_deletion_fix.sql`
   - `email_system_migration.sql`
   - `fix_deletion_constraint.sql`
   - `fix_dogs_rls_for_availability.sql`
   - `fix_messaging_rls_policies.sql`
   - `fix_profile_columns.sql`
   - `fix_reviews_table.sql`
   - `remove_24h_review_delay.sql`
   - `reviews_migration.sql`
   - `setup_meetings.sql`
   - `test_constraint_fix.sql`

### Evidence:

- All migrations are already applied to database
- Files are not referenced in code
- Supabase migrations are in `supabase/migrations/` directory

### Safety Checks:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

### Rollback:

```bash
git revert <commit-hash>
```

---

## PR 6: Image Optimization (Medium Risk)

**Scope:** Replace `<img>` with Next.js `<Image>`  
**Risk Level:** Medium  
**User Impact:** Performance improvement

### Changes:

1. **Replace Image Elements**
   - `app/community/availability/[id]/edit/page.js` - 3 instances
   - `app/community/availability/[id]/page.js` - 3 instances
   - `app/community/page.js` - 4 instances

2. **Add Image Optimization**
   - Install `sharp` package for production
   - Configure Next.js image optimization

### Safety Checks:

```bash
npm install sharp
npm run typecheck
npm run lint
npm test
npm run build
```

### Rollback:

```bash
git revert <commit-hash>
```

---

## PR 7: Package.json Improvements (Low Risk)

**Scope:** Fix package.json scripts and dependencies  
**Risk Level:** Low  
**User Impact:** Better development experience

### Changes:

1. **Fix Scripts**
   - Replace placeholder `typecheck` with actual TypeScript checking
   - Replace placeholder `test` with actual test runner
   - Add `sharp` dependency for image optimization

2. **Update Dependencies**
   - Fix Node.js version compatibility
   - Address security vulnerabilities

### Safety Checks:

```bash
npm install
npm run typecheck  # Should now work
npm run lint
npm run test       # Should now work
npm run build
```

### Rollback:

```bash
git revert <commit-hash>
```

---

## Success Criteria

### Phase 2 (PRs 1-2)

- [ ] Build passes without errors
- [ ] TypeScript compilation succeeds
- [ ] Linting errors reduced by 80%
- [ ] No unused components remain

### Phase 3 (PRs 3-5)

- [ ] All test/debug routes removed
- [ ] All unused files removed
- [ ] All unused SQL files removed
- [ ] Build still passes

### Phase 4 (PRs 6-7)

- [ ] Images optimized for performance
- [ ] Package.json scripts functional
- [ ] Security vulnerabilities addressed
- [ ] Development experience improved

## Risk Mitigation

1. **Each PR is atomic** - Can be reverted independently
2. **Evidence-based deletions** - Every deletion has proof of non-usage
3. **Safety checks** - All changes validated before merge
4. **Rollback plans** - Exact git commands provided for each PR
5. **No behavior changes** - Only removing unused code

## Timeline

- **PR 1-2:** Immediate (critical fixes)
- **PR 3-5:** Next week (low-risk cleanup)
- **PR 6-7:** Following week (optimization)

## Approval Required

- [ ] PR 1: Critical fixes (auto-approve)
- [ ] PR 2: Unused components (auto-approve)
- [ ] PR 3: Test routes (auto-approve)
- [ ] PR 4: Unused files (auto-approve)
- [ ] PR 5: SQL files (auto-approve)
- [ ] PR 6: Image optimization (manual approval)
- [ ] PR 7: Package.json (manual approval)

**Total Files to Remove:** ~40 files  
**Estimated Cleanup:** 15-20% reduction in codebase size  
**Risk Level:** Low to Medium  
**User Impact:** None (internal cleanup only)
