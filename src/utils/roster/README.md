# Roster Utilities - Migration Notice

⚠️ **This directory is being phased out**

## What happened?

The main roster generation logic has been moved to a dedicated services layer:

- **Old location**: `src/utils/roster/generateAndSaveRoster.ts`
- **New location**: `src/services/roster/generation.ts`

## Why the change?

1. **Separation of concerns**: Services layer handles Supabase persistence and business logic
2. **Better organization**: `utils/` for helpers, `services/` for API integration
3. **Clearer architecture**: Aligns with `engine2/` as the canonical roster generation engine

## Migration path

### Current state (temporary)

```typescript
// ✅ WORKS (via compatibility shim)
import { generateAndSaveRoster } from '@/utils/roster/generateAndSaveRoster';
import { generateAndSaveRoster } from '@/utils/roster';
```

### Target state (recommended)

```typescript
// ✅ RECOMMENDED - use the new canonical path
import { generateAndSaveRoster } from '@/services/roster/generation';
```

## Timeline

- **Phase 1** (current): Compatibility shims in place, both paths work
- **Phase 2** (next sprint): Update all imports to use `@/services/roster/generation`
- **Phase 3** (future): Remove compatibility shims, deprecate `src/utils/roster/generateAndSaveRoster.ts`

## What's staying in utils/roster?

These utility modules remain in `src/utils/roster/` as they're genuine helpers:

- `staffHelpers.ts` - Staff data fetching and transformation
- `normalizeShift.ts` - Shift code normalization
- `validateConfig.ts` - Configuration validation
- Test utilities and data generators

## Questions?

See the main architecture doc: `src/engine2/README.md`
