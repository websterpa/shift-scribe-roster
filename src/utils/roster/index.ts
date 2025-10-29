/**
 * DEPRECATED SHIM — imports from src/utils/roster are temporary.
 * Use src/services/roster/generation instead.
 * 
 * This module provides backward compatibility while we transition
 * to the new services layer architecture.
 * 
 * @deprecated since 2025-10-28
 * @see src/services/roster/generation.ts
 */

if (import.meta?.env?.DEV) {
  // eslint-disable-next-line no-console
  console.warn('[DEPRECATED] Import from "@/services/roster" instead of "@/utils/roster".');
}

export { generateAndSaveRoster } from '@/services/roster/generation';
