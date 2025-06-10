
// Safeguards to prevent expensive operations and credit waste
export class RosterSafeguards {
  private static readonly MAX_STAFF_COUNT = 50;
  private static readonly MAX_CYCLE_WEEKS = 12;
  private static readonly MAX_OPERATIONS_PER_MINUTE = 10;
  
  private static operationCount = 0;
  private static lastResetTime = Date.now();

  static validateRosterRequest(
    staffCount: number,
    cycleWeeks: number,
    operationType: string = 'roster_generation'
  ): { isValid: boolean; reason?: string } {
    // Reset operation count every minute
    const now = Date.now();
    if (now - this.lastResetTime > 60000) {
      this.operationCount = 0;
      this.lastResetTime = now;
    }

    // Check operation rate limit
    if (this.operationCount >= this.MAX_OPERATIONS_PER_MINUTE) {
      return {
        isValid: false,
        reason: `Rate limit exceeded: Maximum ${this.MAX_OPERATIONS_PER_MINUTE} ${operationType} operations per minute`
      };
    }

    // Check staff count limit
    if (staffCount > this.MAX_STAFF_COUNT) {
      return {
        isValid: false,
        reason: `Staff count too high: ${staffCount} (maximum: ${this.MAX_STAFF_COUNT})`
      };
    }

    // Check cycle weeks limit
    if (cycleWeeks > this.MAX_CYCLE_WEEKS) {
      return {
        isValid: false,
        reason: `Cycle too long: ${cycleWeeks} weeks (maximum: ${this.MAX_CYCLE_WEEKS} weeks)`
      };
    }

    // Check for potentially expensive combinations
    const complexity = staffCount * cycleWeeks;
    if (complexity > 200) {
      console.warn(`⚠️ High complexity operation: ${staffCount} staff × ${cycleWeeks} weeks = ${complexity} complexity points`);
    }

    this.operationCount++;
    return { isValid: true };
  }

  static estimateOperationCost(staffCount: number, cycleWeeks: number): {
    estimatedTime: number;
    complexity: 'low' | 'medium' | 'high';
    recommendation: string;
  } {
    const complexity = staffCount * cycleWeeks;
    let estimatedTime: number;
    let complexityLevel: 'low' | 'medium' | 'high';
    let recommendation: string;

    if (complexity <= 50) {
      estimatedTime = 100; // milliseconds
      complexityLevel = 'low';
      recommendation = 'Fast operation, safe to proceed';
    } else if (complexity <= 150) {
      estimatedTime = 500;
      complexityLevel = 'medium';
      recommendation = 'Moderate operation, should complete quickly';
    } else {
      estimatedTime = 2000;
      complexityLevel = 'high';
      recommendation = 'Complex operation, consider reducing staff count or cycle length';
    }

    return {
      estimatedTime,
      complexity: complexityLevel,
      recommendation
    };
  }

  static getOperationStats(): {
    operationsThisMinute: number;
    remainingOperations: number;
    resetIn: number;
  } {
    const now = Date.now();
    const resetIn = 60000 - (now - this.lastResetTime);
    
    return {
      operationsThisMinute: this.operationCount,
      remainingOperations: Math.max(0, this.MAX_OPERATIONS_PER_MINUTE - this.operationCount),
      resetIn: Math.max(0, resetIn)
    };
  }
}
