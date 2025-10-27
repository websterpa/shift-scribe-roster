# engine2 (rostering core)

Pure, deterministic primitives for:
- Time segmentation across midnight (and DST-safe by using local midnights)
- Costing with explicit stacking/precedence  
- Rest rules validation
- Holiday/public-holiday tagging
- Componentised cost output suitable for payroll & holiday pay averaging

## Key APIs

- `expandShift(shift, { nightStartHour=22, nightEndHour=6, holidays }) => Segment[]`
- `costShift(shift, segments, ratePolicy) => CostBreakdown`  
- `validateRest(assignments, rules) => ExplainLine[]`
- `generateCorrectiveRoster(input) => CorrectiveResult` - Fair, rotation-friendly roster generation

## Roster Generation: Fairness & Rotation

The corrective roster generator includes advanced fairness mechanisms and **hard rest constraints** to prevent both the "same 5 staff" problem and WTD compliance violations:

### Hard Rest Constraints (Always Enforced)

Before accepting any shift assignment, the generator validates:

1. **Minimum Rest Hours**: Default 11h between consecutive shifts (configurable via `minGapHoursBetweenShifts`)
   - Calculates actual rest hours using shift times (e.g., L ends 22:00, E starts 06:00 = 8h → blocked)
   - Uses custom shift times if provided via `policy.shiftTimes`

2. **Maximum Consecutive Days**: Default 6 working days (configurable via `maxConsecDays`)
   - Forces REST days after hitting the limit
   - Inserts `minDaysOffAfterBlock` rest days (default 2)

3. **Maximum Consecutive Nights**: Default 3 night shifts (configurable via `maxConsecNights`)
   - Automatically inserts REST day after night block when `preferRestAfterNights` enabled
   - Night-specific constraint to reduce fatigue risk

4. **Corrective Pass**: After initial roster construction, runs a second pass to:
   - Insert explicit REST assignments where constraints violated
   - Ensure no illegal turnarounds slipped through
   - Log all enforced rest insertions for transparency

### Tunable Fairness Parameters (Soft Preferences)

```typescript
const policy = {
  ...DEFAULT_CORRECTIVE_POLICY,
  
  // HARD CONSTRAINTS (enforced before accepting assignments)
  maxConsecDays: 6,              // Max consecutive working days
  minDaysOffAfterBlock: 2,       // Min rest days after work block
  maxConsecNights: 3,             // Max consecutive night shifts
  minGapHoursBetweenShifts: 11,  // Min rest hours between shifts
  preferRestAfterNights: true,   // Insert rest after night blocks
  
  // SOFT FAIRNESS TUNING (preferences, coverage still dominates)
  fairnessWeight: 0.3,           // Variance penalty (0.2-0.4 recommended)
  nightBalanceWeight: 0.4,       // Night shift fairness (0.2-0.4 recommended)
  rotationPreference: 0.3,       // Rotation bonus (0-1, default 0.3)
  variancePenaltyStrength: 1.0,  // Multiplier for variance penalty
  preferencePenalty: 0.15,       // Soft preference penalty (0.1-0.2 recommended)
  
  // SHIFT TIMING (for rest calculations)
  shiftTimes: {                  // Optional custom shift times
    E: { start: '06:00', end: '14:00' },
    L: { start: '14:00', end: '22:00' },
    N: { start: '22:00', end: '06:00' }
  }
};
```

### Availability: Hard vs Soft Constraints

The generator distinguishes between **hard unavailability** (must respect) and **soft preferences** (try to avoid):

**Hard Unavailability** (always enforced as eligibility filter):
- Approved leave
- Contract limitations
- Medical restrictions
- Staff set via `availability: { [dateISO]: false }`

**Soft Preferences** (kept as candidates but penalized in scoring):
- Preferred days off
- Shift type preferences
- Non-critical scheduling preferences
- Staff set via `softPreferences: { avoidDays: [...], avoidShifts: [...] }`

**Example:**
```typescript
const staff = [
  {
    id: 's1',
    availability: { '2025-01-15': false },  // HARD: on leave, cannot work
    softPreferences: {
      avoidDays: ['2025-01-20'],             // SOFT: prefers not to work
      avoidShifts: ['N']                     // SOFT: prefers to avoid nights
    }
  }
];
```

This expands the usable staff pool beyond ~5 by keeping preference-violating candidates as fallback options, balanced via `preferencePenalty`.

### Fairness Metrics Logged

- **Gini Coefficient**: 0 = perfect equality, 1 = perfect inequality (aim for < 0.3)
- **Hours Variance**: Lower = more equal distribution
- **Staff Distribution**: Min/max/mean hours per staff

### Deterministic Tie-Breaking

Uses seeded RNG based on roster start date for stable, reproducible results across runs.

## Invariants (enforced by tests)

- Segments exactly cover [start, end) with no overlaps.
- Costs are reproducible and invariant to segment granularity.
- Night/weekend/holiday tags are deterministic.
- Fairness scoring is deterministic (seeded by roster start date).
- **Rest constraints enforced**: No assignment violates min rest hours, max consecutive days, or max consecutive nights.
- **Corrective pass completes**: All constraint violations are resolved with explicit REST assignments.

## Notes

- Holiday pay averaging (52-week) is out of scope here; the costing output is intentionally componentised to feed that calculator elsewhere.
- All functions are pure and side-effect free for reliable testing and composition.
- Uses standard Date arithmetic with local timezone handling for midnight boundaries.
- Fairness weights keep coverage as priority while spreading workload evenly.