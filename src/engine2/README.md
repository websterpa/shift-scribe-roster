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

## Invariants (enforced by tests)

- Segments exactly cover [start, end) with no overlaps.
- Costs are reproducible and invariant to segment granularity.
- Night/weekend/holiday tags are deterministic.

## Notes

- Holiday pay averaging (52-week) is out of scope here; the costing output is intentionally componentised to feed that calculator elsewhere.
- All functions are pure and side-effect free for reliable testing and composition.
- Uses standard Date arithmetic with local timezone handling for midnight boundaries.