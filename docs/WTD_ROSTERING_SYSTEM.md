# WTD-Compliant Rostering System

## Overview

This document describes the corrective rostering rule-set for E/L/N (8-hour) shifts with 11 staff members, enforcing UK Working Time Directive (WTD) 1998 regulations and HSE/NHS good practice.

## Legal Baselines Enforced

### 1. Daily Rest (11 hours)
- **Requirement**: 11 hours uninterrupted rest between shifts
- **Implementation**: `src/engine2/constraints/wtdRules.ts::isValidTransition()`
- **Invalid Transitions**:
  - L→E (8h rest) ❌
  - N→E (4h rest) ❌
  - N→L (8h rest) ❌
- **Valid Transitions**:
  - E→E, E→L, E→N ✅
  - L→L, L→N ✅
  - N→N ✅

### 2. Weekly Rest
- **Requirement**: 24h in each 7 days OR 48h in 14 days
- **Implementation**: `validateWeeklyRest()`
- **Constraint**: ≤6 working days per 7-day rolling window

### 3. Weekly Hours Cap
- **Requirement**: 48h average over 17 weeks
- **Implementation**: `validate48HourAverage()`
- **Opt-out**: Configurable per staff member

### 4. Night Work Average
- **Requirement**: ≤8h per 24h period (averaged over reference period)
- **Implementation**: `validateNightWorkAverage()`

### 5. Consecutive Limits
- **Max consecutive working days**: 6 (configurable)
- **Max consecutive nights**: 3 (configurable)
- **Rest after night block**: 2 days (configurable)

## Shift Times (Defaults)

```typescript
E (Early):  06:00–14:00  (8h)
L (Late):   14:00–22:00  (8h)
N (Night):  22:00–06:00  (8h)
```

Configurable via `ShiftTimes` interface.

## Staff Configuration

```typescript
interface WTDStaffMember {
  id: string;
  name: string;
  contract_hours_per_week: number;        // e.g., 40
  is_night_eligible: boolean;             // Can work nights
  availability_by_date: Record<string, boolean>;
  preferences?: {
    preferred_shifts?: string[];          // e.g., ['E', 'L']
    avoid_shifts?: string[];              // e.g., ['N']
  };
  max_consec_days?: number;               // Override default (6)
  max_consec_nights?: number;             // Override default (3)
  wtd_opted_out?: boolean;                // WTD 48h opt-out
}
```

## Generation Strategy

### Step 1: Seed Night Blocks
- **Priority**: Nights are hardest to fill, so assign first
- **Method**: Rotating 2-3 night blocks across night-eligible staff
- **Enforcement**: 
  - Max consecutive nights (3 default)
  - Mandatory rest days after block (2 days)
  - Only night-eligible staff

### Step 2: Fill E and L Shifts
- **Method**: Round-robin over remaining available staff
- **Constraints**:
  - Skip assignments violating 11h rest rule
  - Respect weekly rest windows
  - Check consecutive day limits

### Step 3: Coverage Verification
- Count actual vs. required for each shift/day
- Identify shortfalls

### Step 4: Fairness Optimization
- Calculate variance in:
  - Total shifts per staff
  - Night shifts per staff
  - Weekend shifts per staff
- Target: std-dev < 1.5 for 28-day period

### Step 5: Validation Pass
- Run `validateStaffWTD()` for all staff
- Flag violations for review
- Fail generation if critical violations found

## Hard Constraints (Must Hold)

1. **Coverage**: `∑ₛ x[s,d,t] = required[d,t]` for all days/shifts
2. **One shift per day**: `∑ₜ x[s,d,t] ≤ 1` per staff per day
3. **Daily rest**: No L→E, N→E, N→L transitions
4. **Weekly rest**: ≤6 working days per 7-day window
5. **Weekly hours**: ≤48h average (unless opted out)
6. **Night average**: ≤8h per 24h period
7. **Max consecutive**: Days ≤6, Nights ≤3
8. **Eligibility**: Night shifts only for night-eligible staff

## Soft Constraints (Fairness)

Minimize weighted sum of:
- Variance from equal load: `(assigned[s] - avg)²`
- Variance of nights: Fair distribution across night-eligible staff
- Variance of weekends: Balance Saturday/Sunday fairly
- Preference penalties: Penalize assignments against stated preferences
- Under-utilization: Penalize staff with 0 assignments (ensures all 11 used)

## Guarantees

✅ **All 11 staff used**: Via utilization penalty  
✅ **WTD compliance**: From constraints 3-7  
✅ **Balanced coverage**: Coverage constraints + fairness objective  
✅ **Legal defensibility**: Full audit trail of rule enforcement  

## Acceptance Tests

All tests must pass in CI to prevent regressions:

### Test 1: Coverage Exactness
```bash
npm test -- -t "Coverage exactness"
```
Assert: `filled[d,t] === required[d,t]` for every day/shift

### Test 2: Rest-Matrix Tests
```bash
npm test -- -t "Rest-Matrix"
```
Sample 1,000 staff/day pairs, assert no invalid transitions

### Test 3: Weekly Rest
```bash
npm test -- -t "Weekly Rest"
```
For every 7-day window: `worked_days ≤ 6`

### Test 4: 48-Hour Average
```bash
npm test -- -t "48-Hour Average"
```
Simulate 17 weeks: `avg_hours ≤ 48` (unless opted out)

### Test 5: Night Average
```bash
npm test -- -t "Night Average"
```
Over reference period: `avg_night_hours ≤ 8h/24h`

### Test 6: Utilisation
```bash
npm test -- -t "Utilisation"
```
Assert: `assigned_shifts[s] ≥ 1` for all 11 staff

### Test 7: Fairness
```bash
npm test -- -t "Fairness"
```
`stddev(shifts) ≤ 1.5` for 28-day month

### Test 8: Consecutive Limits
```bash
npm test -- -t "Consecutive"
```
Assert: no violations of max consecutive days/nights

## Configuration Knobs

All editable via UI/config:

```typescript
interface WTDRules {
  min_daily_rest_hours: number;           // 11 default
  weekly_rest: {
    min_24h_each_7_days: boolean;
    min_48h_each_14_days: boolean;
  };
  max_weekly_hours: number;               // 48 default
  night_avg_limit: number;                // 8h default
  max_consec_days: number;                // 6 default
  max_consec_nights: number;              // 3 default
  days_off_after_night_block: number;     // 2 default
  reference_period_weeks: number;         // 17 default
}

interface ShiftTimes {
  E: { start: string; end: string };
  L: { start: string; end: string };
  N: { start: string; end: string };
}
```

## Usage Example

```typescript
import { generateWTDRoster } from '@/engine2/generators/wtdRosterGenerator';

const staff: WTDStaffMember[] = [
  {
    id: 'staff-1',
    name: 'Alice Smith',
    contract_hours_per_week: 40,
    is_night_eligible: true,
    availability_by_date: {},
    wtd_opted_out: false,
  },
  // ... 10 more staff
];

const requirements: CoverageRequirement[] = [
  {
    date: '2025-11-01',
    E: 2,  // Need 2 Early shifts
    L: 2,  // Need 2 Late shifts
    N: 1,  // Need 1 Night shift
  },
  // ... 27 more days
];

const result = generateWTDRoster({ staff, requirements });

console.log('Assignments:', result.assignments);
console.log('Coverage:', result.coverage);
console.log('Violations:', result.violations);
console.log('Fairness:', result.fairness);
```

## Files Structure

```
src/engine2/
├── constraints/
│   └── wtdRules.ts                    # WTD rules engine
└── generators/
    └── wtdRosterGenerator.ts          # Roster generator

src/__tests__/
├── wtd.acceptance.test.ts             # Acceptance tests (CI lock)
├── wtd.generator.test.ts              # Generator unit tests
├── wtd.rules.comprehensive.test.ts    # Rules unit tests
└── snapshot.roster.test.ts            # Regression snapshot tests

docs/
└── WTD_ROSTERING_SYSTEM.md            # This document
```

## Integration with UI

### Requirements Mini-Composer
User selects framework (8h/12h), then uses sliders to set requirements:
- Weekdays: E/L/N counts
- Saturday: E/L/N counts
- Sunday: E/L/N counts

This generates `requirementsByDay` for the entire month.

### Staff Management
Add WTD-specific fields to staff profiles:
- Night eligibility toggle
- Contract hours per week
- WTD opt-out checkbox
- Availability calendar
- Max consecutive days/nights overrides

### Validation UI
Show violations in a dedicated panel:
```
⚠️ WTD Violations
├─ Staff 3: Consecutive working days (7) exceeds limit (6)
├─ Staff 5: Invalid transition L→E at day 12 (< 11h rest)
└─ Staff 8: Average weekly hours (52.3) exceeds 48h limit
```

### Fairness Dashboard
Display fairness metrics:
```
📊 Fairness Metrics
├─ Overall Distribution: σ = 1.2 ✅ (target < 1.5)
├─ Night Distribution: σ = 0.8 ✅
└─ Weekend Distribution: σ = 1.1 ✅
```

## Compliance Audit Trail

Every generation saves:
1. Input parameters (staff, requirements, rules)
2. Generated assignments
3. Validation results (violations)
4. Fairness metrics
5. Timestamp and user ID

This provides full defensibility for inspections and audits.

## References

- [UK Working Time Regulations 1998](https://www.legislation.gov.uk/uksi/1998/1833/contents)
- [NHS Employers: Working Time Directive](https://www.nhsemployers.org/publications/working-time-directive)
- [HSE: Working Time Regulations](https://www.hse.gov.uk/contact/faqs/workingtimedirective.htm)

## Support

For questions or issues with the WTD rostering system:
- Check test results: `npm test -- -t @wtd`
- Review violations in generated rosters
- Consult acceptance tests for expected behavior
- File issues with `[WTD]` prefix
