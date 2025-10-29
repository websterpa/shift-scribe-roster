# Architecture Documentation

## Roster Engine and Services Layer

### Overview
The roster generation system has been refactored into a clean services layer architecture for better maintainability and testability.

### Directory Structure

```
src/
├── services/
│   └── roster/
│       ├── generation.ts          # Main roster generation wrapper
│       ├── index.ts               # Public API facade
│       ├── helpers.ts             # Helper re-exports
│       └── helpers/
│           ├── index.ts           # Helpers facade
│           ├── staffingCalculators.ts    # Optimal staffing calculations
│           ├── overtimeAssignments.ts    # OT assignment utilities
│           ├── validationUtils.ts        # Staffing validation
│           └── utilizationAnalysis.ts    # Staff utilization metrics
│
├── features/
│   └── roster/
│       ├── engine/
│       │   ├── index.ts           # Engine2 public API
│       │   └── adapter.ts         # Result transformers
│       └── patterns/              # Pattern management
│
├── engine2/                       # Core roster generation logic
│   ├── generators/
│   │   ├── correctiveRosterGenerator.ts   # Main generator
│   │   └── wtdRosterGenerator.ts          # WTD-compliant generator
│   ├── constraints/               # WTD rules and validation
│   ├── cost/                      # Shift costing
│   └── time/                      # Time expansion utilities
```

### Import Paths

#### ✅ Recommended (Canonical)
```typescript
// Roster generation
import { generateAndSaveRoster } from '@/services/roster';

// Helpers
import {
  calculateOptimalStaffing,
  validateStaffingRequirements,
  analyzeStaffUtilization,
  createOTCycleEntry,
  normalizeShiftCode,
  buildDemand,
  checkNightReadiness,
  hasDailyRest
} from '@/services/roster/helpers';

// Engine (advanced usage)
import {
  generateCorrectiveRoster,
  expandShift,
  costShift,
  validateRest
} from '@/features/roster/engine';
```

### Architecture Principles

1. **Separation of Concerns**
   - `engine2/`: Pure generation logic, no persistence
   - `services/roster/`: Orchestration + database integration
   - `features/roster/`: Public APIs and adapters

2. **Dependency Flow**
   ```
   UI Components → services/roster → features/roster/engine → engine2
   ```

3. **Helper Organization**
   - All roster utilities now live in `src/services/roster/helpers/`
   - Staffing calculations: optimal staffing, validation
   - OT assignments: variable overtime utilities
   - Utilization analysis: workload distribution
   - Validation utilities: requirement validation
   - Shift normalization and window resolution
   - Night readiness checks and demand building

### Migration Status

✅ **Completed**
- All roster utilities migrated to `services/roster/helpers/`
- `src/utils/roster/` directory completely removed
- All production imports updated to services layer
- All test imports updated to services layer
- Main generation function in `services/roster/generation.ts`
- Engine2 API exposed via `features/roster/engine/`

### Testing Strategy

```typescript
// New tests should use services layer
import { generateAndSaveRoster } from '@/services/roster';
import { calculateOptimalStaffing } from '@/services/roster/helpers';

describe('Roster Generation', () => {
  it('generates roster with optimal staffing', async () => {
    // Test using services layer
  });
});
```

### Performance Considerations

- Engine2 runs in-memory with no database calls
- Services layer handles all I/O operations
- Helpers are pure functions for testability
- Results cached at service boundary

### Error Handling

```typescript
try {
  const result = await generateAndSaveRoster(staff, config);
} catch (error) {
  // Comprehensive error logging at service layer
  // Engine errors bubble up with context
}
```

### Future Enhancements

1. **Performance Optimization**
   - Engine result caching
   - Parallel roster generation
   - Incremental updates

2. **Feature Additions**
   - Advanced shift patterns
   - Multi-site rostering
   - Real-time constraint validation

3. **Documentation**
   - API reference generation
   - Integration guides
   - Performance benchmarks

### Contributing

When adding new roster functionality:

1. Add core logic to `engine2/`
2. Expose via `features/roster/engine/`
3. Add orchestration to `services/roster/`
4. Create helpers in `services/roster/helpers/`
5. Update this documentation

### Related Documentation

- [WTD Rostering System](./WTD_ROSTERING_SYSTEM.md)
- [Engine2 README](../src/engine2/README.md)
- [Pattern Management](../src/features/roster/patterns/README.md)

---

**Last Updated**: 2025-10-29  
**Version**: 2.0 (Services Layer Architecture)
