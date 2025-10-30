/**
 * Centralized Performance Monitoring Utility
 * 
 * Uses the Performance API for accurate, production-ready timing and telemetry.
 * Replaces scattered performance.now() calls with a consistent, labeled interface.
 */

/**
 * Performance utility for timing operations with labeled markers
 */
export const perf = {
  /**
   * Start a performance measurement
   * @param label - Unique label for the operation
   */
  start: (label: string): void => {
    performance.mark(`${label}-start`);
    console.log(`[PERF] 🚀 ${label} started`);
  },

  /**
   * End a performance measurement and log the duration
   * @param label - Label matching the start() call
   */
  end: (label: string): number => {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    
    const entry = performance.getEntriesByName(label, 'measure').pop();
    const duration = entry ? entry.duration : 0;
    
    console.log(`[PERF] ✓ ${label}: ${duration.toFixed(2)}ms`);
    
    // Cleanup marks to prevent memory leaks
    performance.clearMarks(`${label}-start`);
    performance.clearMarks(`${label}-end`);
    performance.clearMeasures(label);
    
    return duration;
  },

  /**
   * Get the duration of a completed measurement without logging
   * @param label - Label of the measurement
   * @returns Duration in milliseconds, or 0 if not found
   */
  getDuration: (label: string): number => {
    const entries = performance.getEntriesByName(label, 'measure');
    if (entries.length === 0) return 0;
    return entries[entries.length - 1].duration;
  },

  /**
   * Log a summary of all measured operations
   */
  summary: (): void => {
    const measures = performance.getEntriesByType('measure');
    
    if (measures.length === 0) {
      console.log('[PERF] 📊 No performance measurements recorded');
      return;
    }
    
    const total = measures.reduce((sum, m) => sum + m.duration, 0);
    
    console.log('━'.repeat(60));
    console.log('[PERF] 📊 Performance Summary');
    console.log('━'.repeat(60));
    
    measures.forEach(m => {
      const percentage = ((m.duration / total) * 100).toFixed(1);
      console.log(`  ${m.name.padEnd(30)} ${m.duration.toFixed(2).padStart(10)}ms (${percentage}%)`);
    });
    
    console.log('━'.repeat(60));
    console.log(`  ${'TOTAL'.padEnd(30)} ${total.toFixed(2).padStart(10)}ms (100.0%)`);
    console.log('━'.repeat(60));
  },

  /**
   * Clear all performance measurements
   */
  clear: (): void => {
    performance.clearMarks();
    performance.clearMeasures();
    console.log('[PERF] 🧹 Cleared all performance measurements');
  },

  /**
   * Get browser memory stats (if available)
   * Only available in Chrome/Edge with --enable-precise-memory-info flag
   */
  getMemoryStats: (): { usedJSHeapSize: number; totalJSHeapSize: number; limit: number } | null => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }
    return null;
  },

  /**
   * Log memory usage (if available)
   */
  logMemory: (): void => {
    const memory = perf.getMemoryStats();
    if (memory) {
      const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const totalMB = (memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
      const limitMB = (memory.limit / 1024 / 1024).toFixed(2);
      console.log(`[PERF] 💾 Memory: ${usedMB}MB used / ${totalMB}MB total (limit: ${limitMB}MB)`);
    } else {
      console.log('[PERF] 💾 Memory stats not available in this browser');
    }
  }
};

/**
 * Async operation wrapper with automatic timing
 * @param label - Label for the operation
 * @param fn - Async function to time
 * @returns Result of the function
 */
export async function timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  perf.start(label);
  try {
    const result = await fn();
    perf.end(label);
    return result;
  } catch (error) {
    perf.end(label);
    throw error;
  }
}

/**
 * Sync operation wrapper with automatic timing
 * @param label - Label for the operation
 * @param fn - Function to time
 * @returns Result of the function
 */
export function timeSync<T>(label: string, fn: () => T): T {
  perf.start(label);
  try {
    const result = fn();
    perf.end(label);
    return result;
  } catch (error) {
    perf.end(label);
    throw error;
  }
}
