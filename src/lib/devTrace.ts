/**
 * Lightweight development tracing utility
 * No-op in production, logs in development
 */

const isDev = import.meta.env.DEV;

export function trace(label: string, payload: unknown): void {
  if (!isDev) return;
  
  console.log(`🔍 [TRACE] ${label}`, payload);
}
