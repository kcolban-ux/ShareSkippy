# ShareSkippy Codebase Cleanup Audit

**Date:** 2024-12-19  
**Phase:** 1 - Read-Only Audit  
**Status:** Complete

## Executive Summary

This audit identified significant cleanup opportunities in the ShareSkippy codebase while maintaining absolute safety. The project has unused components, test/debug routes, and structural inconsistencies that can be safely addressed.

## Safety Checks Results

### npm install

✅ **PASSED** - Dependencies installed successfully  
⚠️ **WARNINGS:**

- Node version mismatch (requires ^20.11.1, running v24.6.0)
- 6 vulnerabilities (2 low, 3 moderate, 1 high)
- 193 packages looking for funding

### npm run typecheck

⚠️ **PARTIAL** - Script exists but only echoes placeholder text  
**Note:** No actual TypeScript checking performed

### npm run lint

❌ **FAILED** - Multiple linting errors found:

- 4 errors (unescaped entities in JSX)
- 25+ warnings (unused variables, missing dependencies, img elements)
- Files with issues: admin/layout.js, community pages, faq/page.js, how-to-use/page.tsx

### npm test

⚠️ **PLACEHOLDER** - Script exists but only echoes "Tests run in Task 9"

### npm run build

❌ **FAILED** - TypeScript compilation error:

```bash
./libs/email/reengage.ts:158:61
Type error: No overload matches this call.
```

**Critical Issue:** Build is broken due to TypeScript error in email system.

## A) Dead/Unused Inventory

### Unused Components (High Confidence)

| Component            | Path                              | Evidence         | Risk | Action |
| -------------------- | --------------------------------- | ---------------- | ---- | ------ |
| Testimonials1.js     | `components/Testimonials1.js`     | No imports found | Low  | Delete |
| Testimonials11.js    | `components/Testimonials11.js`    | No imports found | Low  | Delete |
| Testimonials3.js     | `components/Testimonials3.js`     | No imports found | Low  | Delete |
| FeaturesAccordion.js | `components/FeaturesAccordion.js` | No imports found | Low  | Delete |
| FeaturesGrid.js      | `components/FeaturesGrid.js`      | No imports found | Low  | Delete |
| FeaturesListicle.js  | `components/FeaturesListicle.js`  | No imports found | Low  | Delete |
| FAQ.js               | `components/FAQ.js`               | No imports found | Low  | Delete |

### Unused API Routes (Test/Debug)

| Route                  | Path                                              | Purpose               | Risk | Action            |
| ---------------------- | ------------------------------------------------- | --------------------- | ---- | ----------------- |
| test-resend            | `app/api/test-resend/route.js`                    | Resend API testing    | Low  | Delete (disabled) |
| test-availability      | `app/api/test-availability/route.js`              | Database testing      | Low  | Delete            |
| profile/test           | `app/api/profile/test/route.js`                   | Profile testing       | Low  | Delete            |
| deletion-request/debug | `app/api/account/deletion-request/debug/route.js` | Debug deletion issues | Low  | Delete            |
| admin/test-bulk-email  | `app/api/admin/test-bulk-email/route.js`          | Email testing         | Low  | Delete            |

### Unused Files (Root Level)

| File                                 | Purpose        | Evidence                 | Risk | Action |
| ------------------------------------ | -------------- | ------------------------ | ---- | ------ |
| next                                 | Binary file    | No clear purpose         | Low  | Delete |
| shareskippy_magic_link_template.html | Email template | Superseded by new system | Low  | Delete |
| example-email-usage.js               | Documentation  | No imports               | Low  | Delete |

### Unused Test Files

| File                                  | Purpose          | Risk | Action |
| ------------------------------------- | ---------------- | ---- | ------ |
| test-account-recreation-prevention.js | Account testing  | Low  | Delete |
| test-api-endpoint.js                  | API testing      | Low  | Delete |
| test-api-endpoints.js                 | API testing      | Low  | Delete |
| test-curl-commands.sh                 | API testing      | Low  | Delete |
| test-deletion-cancellation-flow.js    | Deletion testing | Low  | Delete |
| test-dmarc-update.sh                  | Email testing    | Low  | Delete |
| test-emails.js                        | Email testing    | Low  | Delete |
| test-main-domain-email.sh             | Email testing    | Low  | Delete |
| test-reengagement-simple.js           | Email testing    | Low  | Delete |

### Unused SQL Files

| File                                   | Purpose            | Risk | Action |
| -------------------------------------- | ------------------ | ---- | ------ |
| add_can_pick_up_drop_off_migration.sql | Database migration | Low  | Delete |
| add_dog_ids_to_meetings.sql            | Database migration | Low  | Delete |
| apply_migration.sql                    | Database migration | Low  | Delete |
| availability_migration.sql             | Database migration | Low  | Delete |
| comprehensive_deletion_fix.sql         | Database migration | Low  | Delete |
| email_system_migration.sql             | Database migration | Low  | Delete |
| fix_deletion_constraint.sql            | Database migration | Low  | Delete |
| fix_dogs_rls_for_availability.sql      | Database migration | Low  | Delete |
| fix_messaging_rls_policies.sql         | Database migration | Low  | Delete |
| fix_profile_columns.sql                | Database migration | Low  | Delete |
| fix_reviews_table.sql                  | Database migration | Low  | Delete |
| remove_24h_review_delay.sql            | Database migration | Low  | Delete |
| reviews_migration.sql                  | Database migration | Low  | Delete |
| setup_meetings.sql                     | Database migration | Low  | Delete |
| test_constraint_fix.sql                | Database migration | Low  | Delete |

## B) Structure & Quality Issues

### Folder Structure Issues

1. **Mixed Naming Conventions:**
   - `components/` (kebab-case) vs `components/ui/` (kebab-case) ✅
   - `app/` (kebab-case) ✅
   - `libs/` (kebab-case) ✅
   - `hooks/` (kebab-case) ✅

2. **Over-nested Directories:**
   - `app/api/account/deletion-request/debug/` (4 levels deep)
   - `app/api/admin/email-tracking/` (4 levels deep)
   - `app/api/cron/process-deletions/` (4 levels deep)

3. **Inconsistent File Extensions:**
   - Mix of `.js` and `.tsx` in components
   - `components/ui/Badge.tsx` (TypeScript) vs `components/ui/Button.js` (JavaScript)

### Code Quality Issues

1. **Unused Variables (25+ instances):**
   - `constraintError` in deletion-request/debug/route.js
   - `afterError` in deletion-request/debug/route.js
   - `request` parameter in multiple API routes
   - `checkError` in community events
   - `convError` in messages route

2. **Missing Dependencies in useEffect:**
   - `fetchAvailabilityDetails` missing in community pages
   - Multiple React Hook warnings

3. **Image Optimization Issues:**
   - 15+ instances of `<img>` instead of Next.js `<Image>`
   - Performance impact on LCP and bandwidth

4. **Unescaped Entities:**
   - 4 errors with apostrophes in JSX
   - Files: admin/layout.js, community pages, faq/page.js, how-to-use/page.tsx

## C) Config & Scripts Issues

### Package.json Issues

1. **Placeholder Scripts:**

   ```json
   "typecheck": "echo 'Typecheck configured in Task 2'",
   "test": "echo 'Tests run in Task 9'"
   ```

2. **Missing Dependencies:**
   - `sharp` package recommended for production image optimization
   - TypeScript types not properly configured

3. **Engine Mismatch:**
   - Package requires Node ^20.11.1
   - Running on Node v24.6.0

### ESLint Configuration

1. **Rules Fighting Codebase:**
   - `react/no-unescaped-entities` causing 4 errors
   - `@next/next/no-img-element` causing 15+ warnings
   - `react-hooks/exhaustive-deps` causing multiple warnings

## D) Email Safety Snapshot (Read-Only)

### Email System Architecture

**Email Types Supported:**

- `welcome` - New user onboarding
- `nurture_day3` - 3-day follow-up
- `meeting_reminder` - Meeting reminders
- `reengage` - Re-engagement for inactive users
- `new_message` - Message notifications

**Email Templates:**

- `welcome-email.html` + `welcome-email.txt`
- `follow-up-3days.html` + `follow-up-3days.txt`
- `meeting-reminder-1day.html` + `meeting-reminder-1day.txt`
- `re-engagement.html` + `re-engagement.txt`
- `new-message-notification.html` + `new-message-notification.txt`

**Email Triggers:**

- User registration → `welcome` email
- 3 days after registration → `nurture_day3` email
- Meeting scheduled → `meeting_reminder` email
- 7+ days inactive → `reengage` email
- New message received → `new_message` email

**Critical Email Functions:**

- `sendEmail()` - Main email sending function
- `scheduleEmail()` - Schedule emails for later
- `processScheduledEmails()` - Process queued emails
- `processReengageEmails()` - Process re-engagement emails

**⚠️ CRITICAL ISSUE:** TypeScript error in `libs/email/reengage.ts:158` breaks build

## Risk Assessment

### High Risk (Do Not Touch)

- Email system functions and triggers
- Database schema and RLS policies
- Authentication and user management
- Payment processing (Stripe integration)

### Medium Risk (Careful Review Required)

- API route functionality
- Component props and interfaces
- Database migrations (already applied)

### Low Risk (Safe to Remove)

- Unused components with no imports
- Test/debug API routes
- Unused SQL migration files
- Unused test files

## Recommendations

### Immediate Actions (Phase 2)

1. Fix TypeScript error in `libs/email/reengage.ts:158`
2. Remove unused components (7 files)
3. Remove test/debug API routes (5 routes)
4. Remove unused test files (9 files)
5. Remove unused SQL files (15 files)

### Medium-term Actions (Phase 3)

1. Implement proper TypeScript checking
2. Add missing dependencies (sharp, proper types)
3. Fix ESLint warnings and errors
4. Optimize images (replace `<img>` with `<Image>`)
5. Clean up unused variables

### Long-term Actions (Phase 4)

1. Consolidate duplicate utilities
2. Normalize file extensions (choose JS or TS)
3. Add proper testing framework
4. Implement proper CI/CD checks

## Evidence Summary

- **Unused Components:** 7 files, 0 imports found
- **Unused API Routes:** 5 test/debug routes
- **Unused Files:** 3 root-level files
- **Unused Test Files:** 9 files
- **Unused SQL Files:** 15 migration files
- **Linting Issues:** 4 errors, 25+ warnings
- **Build Issues:** 1 TypeScript error (critical)
- **Dependencies:** 6 vulnerabilities, engine mismatch

**Total Cleanup Potential:** ~40 files can be safely removed
