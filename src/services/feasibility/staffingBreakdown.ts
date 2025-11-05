/**
 * Per-Shift Staffing Breakdown
 * Helpers to compute shift-specific requirements for 8h (E/L/N) or 12h (D/N) systems
 */

export type System = '8h' | '12h';
export type ShiftKey = 'E' | 'L' | 'N' | 'D';

/**
 * Detect system based on shift length
 */
export function detectSystem(shiftLength: number): System {
  console.log('🔍 Detecting system from shift length:', shiftLength);
  return shiftLength === 12 ? '12h' : '8h';
}

/**
 * Get active shift keys for a given system
 */
export function activeShiftKeys(sys: System): ShiftKey[] {
  const keys = sys === '12h' ? (['D', 'N'] as ShiftKey[]) : (['E', 'L', 'N'] as ShiftKey[]);
  console.log(`📋 Active shift keys for ${sys}:`, keys);
  return keys;
}

/**
 * Count occurrences of each shift type in the pattern cycle
 */
export function countShiftsInCycle(seq: string[], sys: System): Record<ShiftKey, number> {
  console.log('🔢 Counting shifts in cycle:', { seq, sys });
  const keys = activeShiftKeys(sys);
  const tally: Record<ShiftKey, number> = { E: 0, L: 0, N: 0, D: 0 };
  
  for (const s of seq) {
    if (keys.includes(s as ShiftKey)) {
      tally[s as ShiftKey] = (tally[s as ShiftKey] || 0) + 1;
    }
  }
  
  console.log('✅ Shift counts:', tally);
  return tally;
}

/**
 * Calculate weekly requirements based on daily requirements
 */
export function weeklyRequired(
  requiredPerDay: Partial<Record<ShiftKey, number>>, 
  sys: System, 
  days: number = 7
): Record<ShiftKey, number> {
  console.log('📊 Calculating weekly requirements:', { requiredPerDay, sys, days });
  const keys = activeShiftKeys(sys);
  const out: Record<ShiftKey, number> = { E: 0, L: 0, N: 0, D: 0 };
  
  keys.forEach(k => {
    out[k] = (requiredPerDay[k] || 0) * days;
  });
  
  console.log('✅ Weekly requirements:', out);
  return out;
}

/**
 * Calculate coverage percentage for each shift type
 */
export function calculateCoverage(
  cycleCounts: Record<ShiftKey, number>,
  weeklyReq: Record<ShiftKey, number>,
  cycleLength: number,
  staffCount: number
): Record<ShiftKey, number> {
  console.log('📈 Calculating coverage:', { cycleCounts, weeklyReq, cycleLength, staffCount });
  const coverage: Record<ShiftKey, number> = { E: 0, L: 0, N: 0, D: 0 };
  
  // Coverage = (shifts provided per week) / (shifts required per week) * 100
  // Shifts provided per week = (cycleCounts * staffCount) / (cycleLength / 7)
  const weeksInCycle = cycleLength / 7;
  
  (['E', 'L', 'N', 'D'] as ShiftKey[]).forEach(k => {
    if (weeklyReq[k] > 0) {
      const shiftsProvidedPerWeek = (cycleCounts[k] * staffCount) / weeksInCycle;
      coverage[k] = (shiftsProvidedPerWeek / weeklyReq[k]) * 100;
    }
  });
  
  console.log('✅ Coverage percentages:', coverage);
  return coverage;
}
