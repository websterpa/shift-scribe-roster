# Pattern Management System

## Overview

The pattern management system provides a flexible way to define and apply repeating shift patterns to staff members. When **pattern-locked mode** is enabled, rosters are generated from these patterns rather than freely assigning shifts.

## Core Concepts

### 1. Pattern Templates

A **pattern template** defines a repeating sequence of shift codes:

```typescript
{
  id: "pattern-123",
  tenant_id: "tenant-456",
  pattern_name: "4 on 4 off (DDNN)",
  pattern_sequence: ['D', 'D', 'N', 'N', 'R', 'R', 'R', 'R'],
  pattern_length: 8
}
```

**Valid shift codes:**
- `D` - Day shift (12h framework)
- `E` - Early shift (8h framework)
- `L` - Late shift (8h framework)
- `N` - Night shift (both frameworks)
- `R` - Rest day (no work scheduled)

### 2. Pattern Binding

A **pattern binding** assigns a pattern to a specific staff member with a personal anchor date:

```typescript
{
  staff_id: "staff-123",
  pattern_id: "pattern-456",
  pattern_start_date: "2025-01-01"  // Day 0 of the pattern cycle
}
```

### 3. Pattern Resolution

**Resolution priority:**
1. **Custom pattern binding** (if staff has a personal pattern assigned)
2. **Site default pattern** (fallback for all staff at a site)

```typescript
const { template, binding } = await resolvePatternForStaff(
  staffId,
  tenantId,
  siteId
);
```

### 4. Pattern Expansion

Patterns are expanded across the roster horizon using the staff member's anchor date:

### 5. Absence Overlay

**Approved absences supersede pattern duties.** When staff have approved leave or sick days, those dates are marked as rest ('R') with an absence marker ('A'), preventing duty assignment:

```typescript
// Pattern says: D, D, N, N, R, R, R, R
// Staff has leave: Jan 2-3

// Before overlay:
// Jan 1: D, Jan 2: D, Jan 3: N, Jan 4: N

// After overlay:
// Jan 1: D, Jan 2: R (A=annual), Jan 3: R (A=annual), Jan 4: N
```

```typescript
const expandedDays = expandPatternOverRange(
  template,
  binding,
  '2025-01-01',  // Roster start
  '2025-01-31'   // Roster end (inclusive)
);

// Returns:
[
  { date: '2025-01-01', shift_code: 'D', is_rest: false },
  { date: '2025-01-02', shift_code: 'D', is_rest: false },
  { date: '2025-01-03', shift_code: 'N', is_rest: false },
  { date: '2025-01-04', shift_code: 'N', is_rest: false },
  { date: '2025-01-05', shift_code: 'R', is_rest: true },
  // ... continues cycling through pattern
]
```

## Absence Overlay System

### How Absences Work

1. **Load Approved Absences**
   - Queries `leave_requests` table for approved leave
   - Filters by staff IDs and date range
   - Includes annual leave, sick leave, unpaid leave, etc.

2. **Overlay on Patterns**
   - For each absence day, force `shift_code = 'R'`
   - Add `absence: 'A'` marker for UI display
   - Store `absenceType` (annual, sick, etc.)

3. **Duty Generation Exclusion**
   - Pattern generator skips days marked with absence
   - No duties created on absence days
   - Appears as blocked in roster

### Usage Example

```typescript
import { applyAbsenceOverlay } from '@/features/roster/patterns';

// After expanding patterns
const expansions = expandPatternsBatch(resolutions, startDate, endDate);

// Apply absence overlay
const overlaid = await applyAbsenceOverlay(
  expansions,
  startDate,
  endDate
);

// Now absence days are marked:
// { date: '2025-01-05', shift_code: 'R', is_rest: true, absence: 'A', absenceType: 'annual' }
```

### Absence Precedence

**Order of priority:**
1. **Approved absence** (highest) - Blocks pattern duties
2. **Pattern duty** - Work day from pattern
3. **Pattern rest** (lowest) - Regular rest day

Absences always win over pattern duties.

## Pattern Adherence Tracking

### Adherence Metrics

Pattern adherence tracks how closely roster assignments follow staff patterns:

```typescript
interface PatternAdherenceMetrics {
  staffId: string;
  staffName?: string;
  expectedDutyDays: number;      // Work days in pattern (not R)
  matchedDutyDays: number;        // Assignments on expected work days
  adherencePct: number;           // matchedDutyDays / expectedDutyDays * 100
  remappedELtoD?: number;         // E/L codes remapped to D (12h)
  restPreservedDays?: number;     // R days with no assignment
  absenceDays?: number;           // Days blocked by absence
}
```

### Calculating Adherence

```typescript
import { calculatePatternAdherence } from '@/features/roster/patterns';

// After generation, calculate adherence
const summary = calculatePatternAdherence(
  expansions,       // Pattern expansions
  assignments,      // Actual roster assignments
  staffNames        // Optional name lookup
);

console.log(summary.overallAdherence);  // e.g., 97.5%
console.log(summary.byStaff);           // Per-staff metrics
```

### Adherence Validation

```typescript
import { validatePatternAdherence } from '@/features/roster/patterns';

const validation = validatePatternAdherence(summary, 95); // 95% minimum

if (!validation.valid) {
  console.warn('Adherence issues:', validation.violations);
}
```

### Adherence Thresholds

- **≥95%**: Excellent - Pattern closely followed
- **85-94%**: Good - Minor deviations
- **<85%**: Needs Review - Significant pattern overrides

### What Counts as Adherence

**Counted as adherent:**
- Assignment matches pattern work day
- E/L → D remap in 12h framework (tracked separately)
- Rest day preserved (no assignment on R)
- Absence day blocked (no assignment on A)

**Counted as non-adherent:**
- Missing assignment on pattern work day
- Assignment on pattern rest day (R)
- Assignment on absence day (A)

## Pattern-Locked Generation

### Enabling Pattern-Locked Mode

```typescript
import { generateCorrectiveRoster } from '@/features/roster/engine';

const result = await generateCorrectiveRoster({
  days: ['2025-01-01', '2025-01-02', '2025-01-03'],
  staff: [...],
  requirements: {...},
  policy: {...},
  framework: '12h',
  
  // Enable pattern-locked mode
  patternLocked: true,
  tenantId: 'tenant-123',
  siteId: 'site-456'
});
```

### How It Works

1. **Pattern Resolution**
   - For each staff member, resolve their active pattern (custom > site default)
   - Staff without patterns are excluded from generation

2. **Pattern Expansion**
   - Expand each pattern across the roster horizon
   - Each day gets a shift code based on the pattern cycle

3. **Duty Generation**
   - Create candidate duties **only** on work days (`is_rest: false`)
   - **Never** convert `R` (rest) days into duties
   - Framework remapping: In 12h mode, `E`/`L` → `D` automatically

4. **Absence Overlay** (NEW)
   - Load approved absences from database
   - Mark absence days as rest with 'A' marker
   - Block duty generation on absence days

5. **Coverage Matching**
   - Match pattern duties to coverage requirements
   - Prefer pattern-sourced duties over free assignments
   - If coverage needs exceed pattern supply, use overtime or unpatterned staff

### Framework Compatibility

#### 8h Framework
- Valid codes: `E`, `L`, `N`, `R`
- Patterns use Early/Late/Night shifts
- No remapping needed

#### 12h Framework
- Valid codes: `D`, `N`, `R`
- Patterns with `E`/`L` are automatically remapped to `D`
- Example: `['E', 'L', 'N', 'R']` → `['D', 'D', 'N', 'R']`

### Important Constraints

**Rest Day Protection:**
- `R` days in patterns are **sacred**
- Generator will never override `R` to assign a duty
- If coverage requires more staff, unpatterned staff or OT must be used

**Absence Protection:**
- Approved absences supersede pattern duties
- Days with absences are forced to 'R' with 'A' marker
- Generator excludes absence days from duty creation
- Absence type stored for UI display (annual, sick, etc.)

**Pattern Integrity:**
- Each staff member follows their own pattern cycle
- Patterns repeat automatically based on `pattern_length`
- Anchor date determines where each staff member is in their cycle

## Database Schema

### Site Patterns Table

```sql
CREATE TABLE public.site_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  sequence jsonb NOT NULL,          -- Pattern sequence array
  repeat_weeks integer NOT NULL,    -- Cycle length in weeks
  created_at timestamptz NOT NULL,
  site_id text NOT NULL,
  name text NOT NULL,
  system text NOT NULL              -- '8h' or '12h'
);
```

### Custom Patterns Table

```sql
CREATE TABLE public.custom_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL,
  name text NOT NULL,
  shift_type text NOT NULL,         -- '8h' or '12h'
  pattern text[] NOT NULL           -- Shift code sequence
);
```

### Staff Pattern Bindings (TODO)

```sql
-- Future table for explicit pattern bindings
CREATE TABLE public.staff_pattern_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  pattern_id uuid NOT NULL,         -- References site_patterns or custom_patterns
  pattern_start_date date NOT NULL, -- Personal anchor date
  created_at timestamptz NOT NULL
);
```

## API Reference

### Loaders

```typescript
// Load all site patterns for a tenant
const sitePatterns = await loadSitePatterns(tenantId);

// Load all custom patterns for a tenant
const customPatterns = await loadCustomPatterns(tenantId);

// Load both site and custom patterns
const allPatterns = await loadAllPatterns(tenantId);
```

### Resolution

```typescript
// Resolve pattern for a single staff member
const { template, binding } = await resolvePatternForStaff(
  staffId,
  tenantId,
  siteId
);

// Batch resolve for multiple staff
const resolutions = await resolvePatternsBatch(
  staffIds,
  tenantId,
  siteId
);
// Returns: Map<staffId, { template, binding }>
```

### Expansion

```typescript
// Expand a pattern over a date range
const days = expandPatternOverRange(
  template,
  binding,
  '2025-01-01',
  '2025-01-31'
);

// Batch expand for multiple staff
const expansions = expandPatternsBatch(
  resolutions,
  '2025-01-01',
  '2025-01-31'
);
// Returns: Map<staffId, ExpandedPatternDay[]>
```

### Absence Overlay

```typescript
// Load absences for staff
const absences = await loadApprovedAbsences(
  staffIds,
  '2025-01-01',
  '2025-01-31'
);

// Overlay absences on patterns
const overlaid = overlayAbsencesOnPatterns(expansions, absences);

// Or use convenience function
const overlaid = await applyAbsenceOverlay(
  expansions,
  '2025-01-01',
  '2025-01-31'
);
// Returns: Map<staffId, ExpandedPatternDayWithAbsence[]>
```

### Pattern-Locked Generation

```typescript
// Generate duties from patterns
const result = await generatePatternLockedDuties({
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  staffIds: ['staff-1', 'staff-2'],
  tenantId: 'tenant-123',
  siteId: 'site-456',
  framework: '12h'
});

console.log(result.duties);                // Candidate duties
console.log(result.staffWithPatterns);     // Staff with patterns
console.log(result.staffWithoutPatterns);  // Staff needing assignment
console.log(result.warnings);              // Issues encountered
```

## Testing

Run pattern tests:

```bash
# Unit tests for expansion
npm test patterns.expand.test.ts

# Unit tests for generation
npm test patterns.generator.test.ts

# E2E tests
npm run e2e -- --grep "pattern"
```

## Migration Guide

### From Legacy Pattern System

The legacy system used:
- `patterns_legacy` table with token strings
- Manual parsing of pattern tokens
- No personal anchor dates

New system provides:
- Structured `PatternTemplate` with typed shift codes
- Personal anchor dates per staff member
- Automatic framework compatibility
- Priority-based resolution (custom > site)

### Gradual Migration

1. Keep legacy patterns readable
2. Create new patterns using `site_patterns` / `custom_patterns`
3. Migrate staff to new patterns with binding table
4. Enable pattern-locked mode gradually per site

## Common Patterns

### 4 on 4 off (12h)
```typescript
['D', 'D', 'N', 'N', 'R', 'R', 'R', 'R']
```

### Continental (12h)
```typescript
['D', 'D', 'N', 'N', 'R', 'R', 'R']
```

### 5 on 3 off (8h)
```typescript
['E', 'E', 'L', 'L', 'N', 'R', 'R', 'R']
```

### Dupont (12h)
```typescript
['D', 'D', 'D', 'D', 'R', 'R', 'R', 'N', 'N', 'N', 'N', 'R', 'R', 'R']
```
