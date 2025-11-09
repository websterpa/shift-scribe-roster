# Deterministic Pattern Positioning

## Overview

The roster generator now supports deterministic pattern positioning using `team_index` and `cycle_anchor_date`. This ensures that staff members maintain consistent positions in their assigned patterns across regenerations and different time periods.

## Key Concepts

### Team Index (`team_index`)
- Integer value (0-based) assigned to each staff member
- Determines their offset within the pattern cycle
- Auto-assigned during generation if NULL, distributed evenly by surname
- Range: 0 to `teams_required - 1`

### Cycle Anchor Date (`cycle_anchor_date`)
- Reference date for pattern cycle calculations
- Defaults to roster start_date if not specified
- Allows shifting the entire team's pattern by changing this date

## How It Works

### Expected Token Calculation

For any given date, a staff member's expected shift token is calculated as:

```
anchorOffset = daysBetween(cycle_anchor_date, date) % cycle_length
staffStart = floor((team_index / teams_required) * cycle_length)
idx = (anchorOffset + staffStart) % cycle_length
expected = sequence[idx]
```

### Example

Given:
- Pattern: `['E','E','L','L','N','N','R','R']` (8-day cycle)
- teams_required: 4
- cycle_anchor_date: 2025-01-01
- Staff A: team_index = 0
- Staff B: team_index = 2

On 2025-01-01:
- Staff A: anchorOffset=0, staffStart=0, idx=0 → 'E'
- Staff B: anchorOffset=0, staffStart=4, idx=4 → 'N'

On 2025-01-02:
- Staff A: anchorOffset=1, staffStart=0, idx=1 → 'E'
- Staff B: anchorOffset=1, staffStart=4, idx=5 → 'N'

## Pattern Adherence Modes

### Locked Mode (Strict)
- **Enabled by**: `pattern_adherence_mode = 'locked'`
- Uses deterministic positioning with team_index
- Only allows rest overrides for WTD compliance
- No fairness rebalancing or shift-type swaps
- Guarantees 100% pattern adherence (except WTD rest corrections)

### Guided Mode (Flexible)
- **Enabled by**: `pattern_adherence_mode = 'guided'`
- Falls back to legacy offset-based calculation
- Allows fairness rebalancing
- May deviate from patterns to meet demand

## Auto-Assignment of Team Indices

When staff members don't have `team_index` assigned:

1. **Sorting**: Staff sorted alphabetically by last name
2. **Distribution**: Evenly distributed across `teams_required` teams
3. **Assignment**: `team_index = position % teams_required`
4. **Persistence**: Saved to database for future consistency

Example with 10 staff and 4 teams:
- Adams → team 0
- Brown → team 1
- Clark → team 2
- Davis → team 3
- Evans → team 0 (wraps around)
- Fisher → team 1
- etc.

## Database Schema

### staff_profiles
```sql
ALTER TABLE staff_profiles 
ADD COLUMN team_index INTEGER NULL;
```

### roster_config
```sql
ALTER TABLE roster_config 
ADD COLUMN cycle_anchor_date DATE NULL;
```

## Usage

### Setting Team Index Manually
```sql
UPDATE staff_profiles 
SET team_index = 2 
WHERE id = 'staff-uuid';
```

### Setting Cycle Anchor Date
```sql
UPDATE roster_config 
SET cycle_anchor_date = '2025-01-01' 
WHERE id = 'config-uuid';
```

### Shifting Pattern by One Day
To advance everyone's pattern position by one day:
```sql
UPDATE roster_config 
SET cycle_anchor_date = cycle_anchor_date + INTERVAL '1 day' 
WHERE id = 'config-uuid';
```

## Benefits

1. **Consistency**: Same pattern position across regenerations
2. **Predictability**: Staff always know their upcoming shifts
3. **Fairness**: Even distribution across teams
4. **Flexibility**: Adjust entire team's pattern by shifting anchor date
5. **Auditability**: Clear deterministic calculation

## Migration Path

Existing rosters continue to work:
- Staff without `team_index` get auto-assigned on next generation
- Configs without `cycle_anchor_date` use start_date as anchor
- Legacy offset-based calculation still used in guided mode

## Testing

See `src/__tests__/roster.pattern-adherence.locked.test.ts` for contract tests verifying:
- 100% adherence with deterministic positioning
- Only rest overrides for WTD compliance
- No shift-type swaps in locked mode
- Consistent pattern advancement with anchor date changes
