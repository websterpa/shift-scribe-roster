
import { buildRosterCycle } from '../rosterCycle';

// Test data scenarios for overstaffing detection
export const createTestStaff = (count: number, shiftTypes: string[] = ['D', 'N']) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `staff_${i + 1}`,
    eligible_shifts: shiftTypes,
    is_shift_worker: true
  }));
};

// Test scenarios
export const overstaffingTestScenarios = [
  {
    name: "Severe Overstaffing - 12 staff for 4-week cycle",
    staff: createTestStaff(12),
    cycleWeeks: 4,
    shiftType: "12h" as const,
    operationalHours: 24,
    expectedOverstaffing: true,
    expectedMinHoursShortfall: true
  },
  {
    name: "Optimal Staffing - 6 staff for 4-week cycle", 
    staff: createTestStaff(6),
    cycleWeeks: 4,
    shiftType: "12h" as const,
    operationalHours: 24,
    expectedOverstaffing: false,
    expectedMinHoursShortfall: false
  },
  {
    name: "Understaffing - 3 staff for 4-week cycle",
    staff: createTestStaff(3),
    cycleWeeks: 4,
    shiftType: "12h" as const,
    operationalHours: 24,
    expectedOverstaffing: false,
    expectedMinHoursShortfall: false // They'll be working too much, not too little
  },
  {
    name: "Edge Case - 8 staff 8-hour shifts",
    staff: createTestStaff(8),
    cycleWeeks: 6,
    shiftType: "8h" as const,
    operationalHours: 24,
    expectedOverstaffing: true,
    expectedMinHoursShortfall: true
  }
];

// Core testing function
export const runOverstaffingTest = (scenario: typeof overstaffingTestScenarios[0]) => {
  console.log(`🧪 Testing: ${scenario.name}`);
  
  try {
    const startTime = performance.now();
    
    // Generate roster cycle
    const cycle = buildRosterCycle(
      scenario.staff,
      scenario.cycleWeeks,
      scenario.shiftType,
      scenario.operationalHours,
      30 // handshake minutes
    );
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    // Calculate actual hours worked per staff member
    const staffHours: { [staffId: string]: number } = {};
    const shiftHours = scenario.shiftType === "12h" ? 12 : 8;
    
    scenario.staff.forEach(staff => {
      staffHours[staff.id] = 0;
    });
    
    // Count shifts for each staff member
    for (let week = 0; week < scenario.cycleWeeks; week++) {
      for (let day = 0; day < 7; day++) {
        if (cycle[week] && cycle[week][day]) {
          Object.keys(cycle[week][day]).forEach(staffId => {
            const shift = cycle[week][day][staffId];
            if (shift !== 'R') { // Not a rest day
              staffHours[staffId] += shiftHours;
            }
          });
        }
      }
    }
    
    // Calculate metrics
    const totalStaff = scenario.staff.length;
    const minHoursPerWeek = 32; // Standard minimum
    const expectedMinHoursTotal = minHoursPerWeek * scenario.cycleWeeks;
    
    const staffBelowMinimum = Object.values(staffHours).filter(hours => hours < expectedMinHoursTotal).length;
    const averageHours = Object.values(staffHours).reduce((sum, hours) => sum + hours, 0) / totalStaff;
    const minHoursShortfall = averageHours < expectedMinHoursTotal;
    
    // Overstaffing calculation (simplified)
    const totalRequiredShifts = scenario.cycleWeeks * 7 * (scenario.operationalHours / shiftHours);
    const optimalStaffCount = Math.ceil(totalRequiredShifts / (scenario.cycleWeeks * 7 * 0.7)); // 70% utilization target
    const isOverstaffed = totalStaff > optimalStaffCount * 1.2; // 20% tolerance
    
    const result = {
      scenario: scenario.name,
      success: true,
      executionTime: Math.round(executionTime),
      metrics: {
        totalStaff,
        optimalStaffCount,
        isOverstaffed,
        staffBelowMinimum,
        averageHours: Math.round(averageHours),
        expectedMinHours: expectedMinHoursTotal,
        minHoursShortfall,
        staffHoursDistribution: staffHours
      },
      validations: {
        overstaffingDetected: isOverstaffed === scenario.expectedOverstaffing,
        minHoursShortfallDetected: minHoursShortfall === scenario.expectedMinHoursShortfall
      }
    };
    
    console.log(`✅ ${scenario.name} completed in ${executionTime.toFixed(1)}ms`);
    console.log(`📊 Staff: ${totalStaff}, Optimal: ${optimalStaffCount}, Overstaffed: ${isOverstaffed}`);
    console.log(`⏰ Avg hours: ${result.metrics.averageHours}, Expected: ${expectedMinHoursTotal}`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Test failed: ${scenario.name}`, error);
    return {
      scenario: scenario.name,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: 0,
      metrics: null,
      validations: null
    };
  }
};

// Run all tests
export const runAllOverstaffingTests = () => {
  console.log('🚀 Starting Overstaffing Detection Test Suite');
  const results = overstaffingTestScenarios.map(runOverstaffingTest);
  
  const successCount = results.filter(r => r.success).length;
  const totalTime = results.reduce((sum, r) => sum + r.executionTime, 0);
  
  console.log('\n📋 Test Summary:');
  console.log(`✅ Passed: ${successCount}/${results.length}`);
  console.log(`⏱️  Total execution time: ${totalTime.toFixed(1)}ms`);
  
  // Validation summary
  const validationResults = results.filter(r => r.validations).map(r => r.validations!);
  const overstaffingAccuracy = validationResults.filter(v => v.overstaffingDetected).length;
  const shortfallAccuracy = validationResults.filter(v => v.minHoursShortfallDetected).length;
  
  console.log(`🎯 Overstaffing detection accuracy: ${overstaffingAccuracy}/${validationResults.length}`);
  console.log(`📉 Min hours shortfall accuracy: ${shortfallAccuracy}/${validationResults.length}`);
  
  return results;
};
