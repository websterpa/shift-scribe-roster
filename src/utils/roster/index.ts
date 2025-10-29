/**
 * COMPATIBILITY SHIM — stable backward compatibility layer
 * 
 * This module provides backward compatibility for legacy imports.
 * New code should import from @/services/roster instead.
 * 
 * Architecture:
 * - Production imports go through this shim to services layer
 * - Tests will gradually migrate to direct services imports
 * - This shim remains stable to avoid breaking changes
 * 
 * @stable
 * @see src/services/roster
 */

// Re-export from canonical services layer
export * from '@/services/roster/generation';
