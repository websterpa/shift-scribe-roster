// Performance monitoring for roster generation
export class RosterPerformanceMonitor {
  private static instance: RosterPerformanceMonitor;
  private executionTimes: number[] = [];
  private maxExecutionTime = 5000; // 5 seconds max
  private maxMemoryUsage = 100 * 1024 * 1024; // 100MB max

  static getInstance(): RosterPerformanceMonitor {
    if (!RosterPerformanceMonitor.instance) {
      RosterPerformanceMonitor.instance = new RosterPerformanceMonitor();
    }
    return RosterPerformanceMonitor.instance;
  }

  startOperation(operationName: string) {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    return {
      finish: () => {
        const endTime = performance.now();
        const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
        const executionTime = endTime - startTime;
        const memoryUsed = endMemory - startMemory;

        this.executionTimes.push(executionTime);

        // Keep only last 10 execution times
        if (this.executionTimes.length > 10) {
          this.executionTimes.shift();
        }

        const result = {
          operationName,
          executionTime: Math.round(executionTime),
          memoryUsed: Math.round(memoryUsed / 1024), // Convert to KB
          isPerformant: executionTime < this.maxExecutionTime,
          isMemoryEfficient: memoryUsed < this.maxMemoryUsage
        };

        console.log(`⚡ ${operationName}: ${result.executionTime}ms, ${result.memoryUsed}KB`);

        if (!result.isPerformant) {
          console.warn(`⚠️ Slow execution detected: ${result.executionTime}ms (max: ${this.maxExecutionTime}ms)`);
        }

        if (!result.isMemoryEfficient) {
          console.warn(`⚠️ High memory usage: ${result.memoryUsed}KB (max: ${this.maxMemoryUsage / 1024}KB)`);
        }

        return result;
      }
    };
  }

  getAverageExecutionTime(): number {
    if (this.executionTimes.length === 0) return 0;
    return this.executionTimes.reduce((sum, time) => sum + time, 0) / this.executionTimes.length;
  }

  isPerformanceHealthy(): boolean {
    const avgTime = this.getAverageExecutionTime();
    return avgTime < this.maxExecutionTime * 0.8; // 80% of max time
  }
}

// Usage wrapper for roster operations
export const monitorRosterOperation = <T>(
  operationName: string,
  operation: () => T
): T => {
  const monitor = RosterPerformanceMonitor.getInstance();
  const measurement = monitor.startOperation(operationName);
  
  try {
    const result = operation();
    measurement.finish();
    return result;
  } catch (error) {
    measurement.finish();
    throw error;
  }
};
