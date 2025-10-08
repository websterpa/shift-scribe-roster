# Commit Message

```
feat: fix upsert idempotency + harden night-shift generation with comprehensive tests

CRITICAL FIX
- Added unique constraint on roster_assignments(version_id, date, staff_id)
- Fixes 42P10 error: "no unique or exclusion constraint matching ON CONFLICT"
- Enables safe retry without creating duplicate assignments

GOALS
- Prevent data loss on navigation/network issues
- Ensure demand expands across full pattern horizon (not just 7 days)
- Maintain diagnostic accuracy (banner reflects saved DB data)
- Add test coverage to prevent regressions

CHANGES

A. Database Migration
- Added idx_roster_assignments_unique on (version_id, date, staff_id)
- Enforces business rule: one assignment per staff per date per roster version
- Enables upsert idempotency for safe retry

B. Persistence-before-navigation (GuidedRosterBuilderV2.tsx)
- Changed insert → upsert with conflict resolution on (version_id, date, staff_id)
- Add row count verification: savedCount === expectedCount
- Add error handling: toast + NO navigation on failure
- Add loading state: button shows spinner during generation
- Add DEV logs: post-save DB token counts

B. Enhanced diagnostics (enhancedRosterGenerator.ts)
- Add pre-generation requirements table (console.table)
- Add horizon expansion verification logs
- Add staff pool size diagnostics
- Add post-assignment token counts
- Maintain existing night pool diagnostics

C. Horizon expansion tests (horizon.expansion.test.ts) - NEW
- Test 16-day pattern demand expansion
- Test weekly requirements repeat across full horizon
- Test demand continues beyond day 7

D. Night presence tests (night.presence.test.ts) - NEW
- Test Night generation for 8h and 12h systems
- Test error when no eligible staff
- Test eligible_shifts constraints
- Test supervisor night rules (enabled/disabled)
- All tests tagged with @nights for selective runs

E. Upsert idempotency tests (roster/upsert.idempotency.test.ts) - NEW
- Test no duplicates on repeated upsert with same key
- Test different staff on same date allowed
- Test same staff on different dates allowed
- All tests tagged with @persist for selective runs

F. E2E persistence tests (night-persistence.spec.ts) - NEW
- Test nights persist after hard reload
- Test night count matches requirements after save

G. Documentation
- NIGHT_SHIFT_HARDENING_SUMMARY.md: Complete task breakdown + upsert fix
- TEST_RUN_INSTRUCTIONS.md: Verification procedures + @persist tests
- AI_UPSERT_FIX_SUMMARY.md: Detailed upsert fix documentation
- COMMIT_MESSAGE.md: This message

TESTING
- Run: npm test -- -t @nights (10 tests)
- Run: npm test -- -t @persist (3 tests)
- Run: npx playwright test e2e/night-persistence.spec.ts (2 tests)
- Manual: Generate October roster → hard reload → verify nights visible
- Manual: Check DEV console logs for all 4 diagnostic stages + DB save confirmation

FIXES
- Issue #0: 42P10 error on upsert (added unique constraint)
- Issue #1: Assignments lost on navigation (upsert + verification)
- Issue #2: Generation stops after 7 days (horizon expansion)
- Issue #3: Banner shows 0 nights after generation (DB count logging)

BREAKING CHANGES
None. All changes are additive or internal improvements.

Co-authored-by: AI Assistant
```
