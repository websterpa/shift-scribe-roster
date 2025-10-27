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

The corrective roster generator includes advanced fairness mechanisms to prevent the "same 5 staff" problem:

### Tunable Fairness Parameters

```typescript
const policy = {
  ...DEFAULT_CORRECTIVE_POLICY,
  fairnessWeight: 0.3,          // Variance penalty (0.2-0.4 recommended)
  nightBalanceWeight: 0.4,      // Night shift fairness (0.2-0.4 recommended)
  rotationPreference: 0.3,      // Rotation bonus (0-1, default 0.3)
  variancePenaltyStrength: 1.0, // Multiplier for variance penalty
};
```

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

## Notes

- Holiday pay averaging (52-week) is out of scope here; the costing output is intentionally componentised to feed that calculator elsewhere.
- All functions are pure and side-effect free for reliable testing and composition.
- Uses standard Date arithmetic with local timezone handling for midnight boundaries.
- Fairness weights keep coverage as priority while spreading workload evenly.