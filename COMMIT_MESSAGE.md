# Commit Message

```
feat: harden night-shift generation with persistence guards and comprehensive tests

GOALS
- Prevent data loss on navigation/network issues
- Ensure demand expands across full pattern horizon (not just 7 days)
- Maintain diagnostic accuracy (banner reflects saved DB data)
- Add test coverage to prevent regressions

CHANGES

A. Persistence-before-navigation (GuidedRosterBuilderV2.tsx)
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

E. E2E persistence tests (night-persistence.spec.ts) - NEW
- Test nights persist after hard reload
- Test night count matches requirements after save

F. Documentation
- NIGHT_SHIFT_HARDENING_SUMMARY.md: Complete task breakdown
- TEST_RUN_INSTRUCTIONS.md: Verification procedures
- COMMIT_MESSAGE.md: This message

TESTING
- Run: npm test -- -t @nights (10 tests)
- Run: npx playwright test e2e/night-persistence.spec.ts (2 tests)
- Manual: Generate October roster → hard reload → verify nights visible
- Manual: Check DEV console logs for all 4 diagnostic stages

FIXES
- Issue #1: Assignments lost on navigation (upsert + verification)
- Issue #2: Generation stops after 7 days (horizon expansion)
- Issue #3: Banner shows 0 nights after generation (DB count logging)

BREAKING CHANGES
None. All changes are additive or internal improvements.

Co-authored-by: AI Assistant
```
