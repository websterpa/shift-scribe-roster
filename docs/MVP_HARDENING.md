# MVP Hardening - Configuration Drift Prevention

## Overview

This MVP hardening update enforces strict configuration consistency between the Feasibility Calculator and Roster Builder, forces pattern-locked generation mode, and simplifies the UI by hiding non-MVP routes.

## Changes Implemented

### 1. Configuration Drift Blocking

**Problem:** Users could configure settings in the Feasibility Calculator, then manually change them in the Builder, causing:
- Patterns not being followed
- Counts not matching between Feasibility and Builder
- Unexpected roster generation results

**Solution:**
- Integrated `checkConfig` utility from `src/utils/consistency/checkConfig.ts`
- Added `ConfigValidationGuard` component that displays blocking errors
- Generation is now blocked when configuration errors are detected
- Real-time validation runs whenever builder state changes

**Components:**
- `src/components/roster/ConfigValidationGuard.tsx` - Visual error display
- `src/pages/roster/GuidedRosterBuilderV2.tsx` - Integrated consistency checking
- `src/utils/consistency/checkConfig.ts` - Core validation logic

**Validation Checks:**
- Framework-hours mismatch (8h vs 12h)
- Invalid shift keys for selected framework
- Zero-shift requirements
- Requirements drift between Feasibility and Builder
- Pattern-framework incompatibility
- Configuration snapshot drift

### 2. Forced Pattern-Locked Mode

**Problem:** Users could toggle between 'locked' and 'guided' pattern modes, but the MVP should strictly follow patterns.

**Solution:**
- `patternMode` always defaults to `'locked'` in the form
- Removed pattern mode toggle from UI
- Added prominent notice: "Pattern Mode: Locked — Roster will strictly follow the selected pattern"
- Team Index Manager and Cycle Anchor Date controls are always visible
- Comment clearly indicates MVP constraint

**Files Changed:**
- `src/pages/roster/GuidedRosterBuilderV2.tsx` - Removed mode toggle, added notice
- `src/domain/rosterSchema.ts` - Default is 'locked'

### 3. Non-MVP Routes Hidden

**Problem:** Too many routes cluttered the navigation and exposed incomplete features.

**Solution:**
- Commented out non-MVP routes in `AppRouter.tsx`
- MVP Routes (Active):
  - `/dashboard` - Dashboard
  - `/staff` - Staff management
  - `/feasibility` - Feasibility Calculator
  - `/roster/builder` - Roster Builder
  - `/roster/monthly` - Monthly roster view
  - `/support` - Support
  - `/help` - Help

- Non-MVP Routes (Hidden):
  - Legacy wizard, old roster viewer, testing pages, admin pages, pattern management, etc.
  - All commented with clear markers for future restoration

**File Changed:**
- `src/components/router/AppRouter.tsx` - Routes commented with clear MVP markers

## Testing

### Configuration Drift Detection
1. Configure roster in Feasibility Calculator
2. Use "Use This Setup" to navigate to Builder
3. Manually change framework or requirements
4. Observe blocking error with specific issue details
5. Verify generation button is disabled

### Pattern Locked Mode
1. Navigate to Roster Builder
2. Verify "Pattern Mode: Locked" notice is displayed
3. Verify Team Index Manager is visible
4. Verify Cycle Anchor Date controls are visible
5. Confirm no toggle to change pattern mode exists

### Route Hiding
1. Navigate through application
2. Verify only MVP routes are accessible in navigation
3. Confirm hidden routes return 404 if accessed directly
4. Verify all MVP functionality remains intact

## Rollback Instructions

If these changes need to be reverted:

1. **Re-enable Non-MVP Routes:**
   - Uncomment routes in `src/components/router/AppRouter.tsx`

2. **Restore Pattern Mode Toggle:**
   - Add pattern mode select/toggle back to Builder UI
   - Update conditionals to show/hide Team Index Manager and Cycle Anchor Date

3. **Remove Drift Blocking:**
   - Remove `ConfigValidationGuard` component usage
   - Remove consistency checking from generation flow
   - Allow generation even with configuration mismatches

## Future Enhancements

- Add snapshot comparison to detect Feasibility → Builder drift more accurately
- Persist feasibility snapshot when "Use This Setup" is clicked
- Add "Reset to Feasibility Config" button to restore snapshot
- Enhance error messages with action buttons to auto-fix issues
- Add configuration audit log to track changes

## Related Files

- `src/components/router/AppRouter.tsx`
- `src/pages/roster/GuidedRosterBuilderV2.tsx`
- `src/components/roster/ConfigValidationGuard.tsx`
- `src/utils/consistency/checkConfig.ts`
- `src/domain/rosterSchema.ts`
- `docs/deterministic-patterns.md`
