
import { createLogger } from "../errorLogger";
import { hasDailyRest, enforceRestRequirement } from "../roster/restValidation";

const logger = createLogger('CoreFixesTest');

/**
 * Simple smoke test for core fixes
 */
export function runCoreFixesTest(): { passed: number; failed: number; results: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  try {
    // Test 1: 11-hour rest enforcement
    const prevShiftEnd = new Date('2024-01-01T22:00:00');
    const nextShiftStart = new Date('2024-01-02T06:00:00'); // Only 8 hours rest
    const hasRest = hasDailyRest(prevShiftEnd, nextShiftStart);
    
    if (!hasRest) {
      results.push('✅ Test 1: 11-hour rest validation correctly detected violation');
      passed++;
    } else {
      results.push('❌ Test 1: 11-hour rest validation failed to detect violation');
      failed++;
    }

    // Test 2: Rest enforcement
    const enforcedShift = enforceRestRequirement('staff1', 'D', prevShiftEnd, nextShiftStart);
    if (enforcedShift === 'R') {
      results.push('✅ Test 2: Rest enforcement correctly changed shift to R');
      passed++;
    } else {
      results.push('❌ Test 2: Rest enforcement failed to change shift to R');
      failed++;
    }

    // Test 3: Valid rest scenario
    const validNextStart = new Date('2024-01-02T10:00:00'); // 12 hours rest
    const validRest = hasDailyRest(prevShiftEnd, validNextStart);
    if (validRest) {
      results.push('✅ Test 3: Valid rest scenario correctly passed');
      passed++;
    } else {
      results.push('❌ Test 3: Valid rest scenario incorrectly failed');
      failed++;
    }

    results.push(`📊 Summary: ${passed} passed, ${failed} failed`);
    
  } catch (error: any) {
    results.push(`❌ Test error: ${error.message}`);
    failed++;
  }

  return { passed, failed, results };
}
