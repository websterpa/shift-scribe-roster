# Night-Shift Hardening Test Instructions

## Quick Verification Checklist

### 1. Run Unit Tests

```bash
# Run all night-related tests
npm test -- -t @nights

# Run persistence/upsert idempotency tests
npm test -- -t @persist

# Expected output:
# ✓ src/__tests__/night.presence.test.ts (7 tests)
#   ✓ generates Night shifts when N demand exists (8h)
#   ✓ generates Night shifts when N demand exists (12h)
#   ✓ throws error when nights required but no eligible staff
#   ✓ night readiness check catches missing eligible staff
#   ✓ respects eligible_shifts constraint for nights
#   ✓ supervisor nights work when enabled
#   ✓ supervisor nights blocked when disabled
#
# ✓ src/__tests__/horizon.expansion.test.ts (3 tests)
#   ✓ 16-day pattern expands demand across full horizon
#   ✓ weekly requirements repeat across full horizon
#   ✓ demand does not stop at day 7
#
# ✓ src/__tests__/roster/upsert.idempotency.test.ts (3 tests)
#   ✓ should not duplicate assignments on repeated upsert with same key
#   ✓ should allow different staff on same date and version
#   ✓ should allow same staff on different dates

# Run enhanced generator tests
npm test -- enhancedGenerator.nights.test

# Expected: All existing tests plus new 16-day pattern test pass
```

### 2. DEV Mode Console Verification

**Navigate to:** `/roster/builder`

**Steps:**
1. Open browser DevTools console
2. Configure roster:
   - System: 8h
   - Pattern: `EELLNNRRRR`
   - Staffing: Set N=1 for all days
3. Click "Generate Roster"

**Expected Console Output:**

```javascript
// 1. Requirements expansion
┌─────────────────────────┬────────┐
│         (index)         │ Values │
├─────────────────────────┼────────┤
│     Horizon Days        │   10   │
│ Days with Requirements  │   10   │
│       Total E           │   20   │
│       Total L           │   20   │
│       Total N           │   10   │
└─────────────────────────┴────────┘

// 2. Staff pools
[G1] Staff pools: {
  total: 6,
  nightEligible: 6,
  nightPoolStaff: [
    'SARAH HILL (CCTV Operator, eligible: Early,Late,Night,Day)',
    'JANE DOE (CCTV Operator, eligible: Early,Late,Night,Day)',
    ...
  ]
}

// 3. Generation result
🎯 Generation Result: {
  totalAssignments: 50,
  nightsGenerated: 10,
  tokenBreakdown: { E: 20, L: 20, N: 10 }
}

// 4. DB save confirmation
💾 Saved to DB: {
  totalSaved: 50,
  nightsSaved: 10,
  tokenCounts: { E: 20, L: 20, N: 10 }
}
```

**Key Checks:**
- ✅ Horizon Days matches pattern length
- ✅ Total N in requirements > 0
- ✅ nightEligible > 0 in staff pools
- ✅ nightsGenerated > 0 in result
- ✅ nightsSaved > 0 in DB save
- ✅ nightsSaved === nightsGenerated (no data loss)

### 3. October Roster Hard Reload Test

**Steps:**
1. Generate a roster for October 2025
2. Verify Night shifts visible in monthly view
3. Note the version ID from URL (`?version=xxx`)
4. Hard reload page (Ctrl+R or Cmd+R)
5. Verify Night shifts still visible
6. Check diagnostics banner shows N count > 0

**Expected:**
- Nights persist after hard reload
- DB count matches UI display
- No "missing nights" warnings

### 4. Persistence Error Handling

**Test navigation block on save failure:**

To simulate (requires DB access):
1. In console, temporarily break DB:
   ```javascript
   // Mock Supabase to fail on insert
   const originalFrom = supabase.from;
   supabase.from = () => ({
     upsert: () => Promise.resolve({ 
       data: null, 
       error: { message: 'Simulated DB error' } 
     })
   });
   ```
2. Try to generate roster
3. **Expected:** Error toast appears, NO navigation to summary page
4. Restore: `supabase.from = originalFrom;`

**Real test:**
- Disconnect network during generation
- Should see error toast
- Should NOT navigate
- Can retry once network restored

### 5. Idempotency Test

**Steps:**
1. Generate roster successfully (note version ID)
2. Navigate back to builder
3. Generate another roster with same configuration
4. Check DB: `SELECT COUNT(*) FROM roster_assignments WHERE version_id = 'xxx' GROUP BY date, staff_id HAVING COUNT(*) > 1`
5. **Expected:** No duplicate assignments (count = 1 for all)

### 6. E2E Test (if Playwright available)

```bash
npx playwright test e2e/night-persistence.spec.ts

# Expected:
# ✓ generated nights persist after hard reload
# ✓ night count matches requirements after save
```

### 7. Horizon > 7 Days Verification

**Manual test:**
1. Configure 16-day pattern: `DDDDRRRRNNNNRRRR`
2. Set requirements for all weekdays (0-6)
3. Generate roster
4. In monthly view, verify assignments exist for days 8-16
5. Check diagnostics: should show assignments across full horizon

**SQL verification:**
```sql
-- Check date range of assignments
SELECT 
  MIN(date) as first_date,
  MAX(date) as last_date,
  COUNT(DISTINCT date) as unique_days,
  COUNT(*) as total_assignments
FROM roster_assignments
WHERE version_id = 'YOUR_VERSION_ID';

-- Expected: unique_days >= 10 for 10-day pattern
```

### 8. Night Eligibility Validation

**Test 1: No eligible staff**
1. Edit all staff → remove "Night" from eligible_shifts
2. Try to generate roster with N demand
3. **Expected:** Error toast: "No eligible staff for Night shifts"
4. **Expected:** NO navigation, NO DB save

**Test 2: Supervisor nights disabled**
1. Set all staff role = "Supervisor"
2. Ensure `allowSupervisorNights = false`
3. Try to generate with N demand
4. **Expected:** Error: "No eligible staff for Night shifts"

**Test 3: Mixed eligibility**
1. Staff A: eligible_shifts = ['Day', 'Night']
2. Staff B: eligible_shifts = ['Day']
3. Generate with D and N requirements
4. **Expected:** Only Staff A gets Night assignments
5. **Expected:** Staff B gets only Day assignments

## Success Criteria Summary

| Test | Pass Criteria |
|------|--------------|
| Unit tests | All 10 @nights tests pass |
| Console logs | All 4 diagnostic stages print correctly |
| Hard reload | Nights visible after reload |
| Error handling | No navigation on save failure |
| Idempotency | No duplicate assignments on retry |
| E2E | Both Playwright tests pass |
| Horizon | Assignments beyond day 7 exist |
| Eligibility | Only eligible staff get nights |

## Troubleshooting

### Issue: "No assignments beyond day 7"
**Check:**
1. Is `patternTokens` passed to generator?
2. Console log: does "Expanded requirements" show correct horizon?
3. Console log: does demand list include dayIdx > 6?

**Fix:** Verify `generateRosterEnhanced` receives `patternTokens: pattern.split('')`

### Issue: "Nights generated but not saved"
**Check:**
1. Console log: does "💾 Saved to DB" appear?
2. Are there errors in Network tab (DB insert failed)?
3. Does row count match: `savedCount === expectedCount`?

**Fix:** Check DB policies allow insert on roster_assignments

### Issue: "Night shifts disappear after reload"
**Check:**
1. Version ID in URL unchanged after reload?
2. DB query: `SELECT * FROM roster_assignments WHERE version_id = 'xxx' AND shift_code = 'N'`
3. DiagnosticsBanner: does it query correct version_id?

**Fix:** Ensure navigation includes `?version=${version.id}` in URL

### Issue: "Tests fail with 'No eligible staff'"
**Check:**
1. Test staff have `eligible_shifts: ['Early', 'Late', 'Night', 'Day']`
2. Generator receives `includeNights: true`
3. Generator receives `allowSupervisorNights` correctly

**Fix:** Update test staff factory to include all shift types

## Performance Benchmarks

Expected generation times (approximate):
- 10-day horizon, 5 staff: < 1 second
- 16-day horizon, 10 staff: < 2 seconds
- 17-week horizon, 20 staff: < 5 seconds

If significantly slower:
- Check if assignments are being duplicated
- Check if demand is being built correctly
- Check if staff pool filtering is efficient

## Files to Monitor

During testing, watch these files in DevTools:
1. `src/utils/roster/enhancedRosterGenerator.ts` - Generation logs
2. `src/pages/roster/GuidedRosterBuilderV2.tsx` - Save logs
3. `src/features/roster/monthly/DiagnosticsBanner.tsx` - Display logic
4. Network tab - Supabase insert requests

## Next Steps After All Tests Pass

1. ✅ Commit changes with message: "feat: harden night-shift generation with tests and guards"
2. ✅ Document any edge cases discovered
3. ✅ Update team on new test suite and diagnostics
4. ✅ Monitor production for next 48h after deployment
