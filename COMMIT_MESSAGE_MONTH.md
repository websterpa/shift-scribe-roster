# Commit Message

```
feat: harden roster generation for full month coverage with verification

CHANGES:
- Generator now expands requirements across EVERY day from 1st to last (inclusive)
- Replaced 7-day horizon fallback with full month boundary calculation
- Added verification: expected vs saved counts per shift code before navigation
- Added retry logic with toast + navigation block on persistence failure
- Added 3-stage DEV diagnostics: expansion → generation → persistence
- Created @month test suite (5 tests) covering 28/30/31 day months

TESTS:
- ✅ October 2025 (31 days) 8h framework → 31 days coverage
- ✅ October 2025 (31 days) 12h framework → 31 days coverage  
- ✅ Weekday-only requirements → no weekend assignments
- ✅ February 2025 (28 days) → exactly 28 days, not 31
- ✅ Inclusive boundaries → covers first and last day

DIAGNOSTICS (DEV):
Stage 1: Requirements Expansion (month range, days expanded, expected counts)
Stage 2: Generation Complete (generated vs expected per code)
Stage 3: Database Persistence (saved vs expected per code)

VERIFICATION:
- Calculates expectedByCode by summing requirements across full month
- Queries DB after save and builds savedByCode
- Compares per-code: savedByCode[code] < expectedByCode[code]
- Retries once on mismatch; blocks navigation on failure
- Monthly header shows actual DB count

FILES:
- src/utils/roster/enhancedRosterGenerator.ts (month expansion logic)
- src/pages/roster/GuidedRosterBuilderV2.tsx (verification + diagnostics)
- src/__tests__/month.full.expansion.test.ts (new test suite)

IMPACT:
- No more partial months (every day 1st→last covered)
- No more lost assignments (verification catches DB failures)
- No more silent failures (DEV logs show exactly what was saved)
- Easier debugging (3-stage diagnostics pinpoint issues)

BREAKING: None (backward compatible, DEV-only diagnostics)
```
