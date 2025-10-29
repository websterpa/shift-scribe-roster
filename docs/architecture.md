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
│
└── utils/
    └── roster/                    # Compatibility shim (stable)
        └── index.ts               # Re-exports from services layer
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
  createOTCycleEntry
} from '@/services/roster/helpers';

// Engine (advanced usage)
import {
  generateCorrectiveRoster,
  expandShift,
  costShift,
  validateRest
} from '@/features/roster/engine';
```

#### ⚠️ Legacy (Compatibility Shim)
```typescript
// Still works via stable compatibility layer
import { generateAndSaveRoster } from '@/utils/roster';
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

3. **Backward Compatibility**
   - `src/utils/roster/index.ts` provides stable shim
   - No breaking changes for existing code
   - Gradual migration path for tests

4. **Helper Organization**
   - Staffing calculations: optimal staffing, validation
   - OT assignments: variable overtime utilities
   - Utilization analysis: workload distribution
   - Validation utilities: requirement validation

### Migration Status

✅ **Completed**
- Core helpers migrated to `services/roster/helpers/`
- Main generation function in `services/roster/generation.ts`
- Engine2 API exposed via `features/roster/engine/`
- Production components updated to services imports
- Compatibility shim established

🔄 **In Progress**
- Test suite migration (gradual)
- Additional utility functions (phase 2c)

📋 **Planned**
- Complete test migration by 2025-11-15
- Remove deprecated helper files after tests updated
- Archive old utils after full transition

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

1. **Phase 2b**: Migrate remaining utils
   - staffHelpers.ts
   - enhancedCycleIntegration.ts
   - shiftCycleGenerator.ts
   - rosterGeneration.ts

2. **Phase 2c**: Test migration
   - Update test imports to services layer
   - Remove old test fixtures
   - Consolidate test utilities

3. **Phase 3**: Documentation
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
