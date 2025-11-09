/**
 * Roster Diagnostics Engine
 * 
 * Provides summary statistics for pattern adherence and assignment distribution
 */

export interface Assignment {
  staffId: string;
  date: string;
  shiftCode: string;
  dayIndex: number;
}

export interface PatternDefinition {
  id: string;
  sequence: string[];
  cycleLength: number;
  teams_required?: number; // Number of teams for deterministic positioning
}

export interface StaffPattern {
  staffId: string;
  patternId: string;
  offset: number;
}

export interface StaffDiagnostics {
  staffId: string;
  staffName?: string;
  totalShifts: number;
  patternCompliance: number;
  expectedShifts: number;
  matchingShifts: number;
}

/**
 * Calculate pattern adherence for each staff member
 * 
 * @param assignments - Array of shift assignments
 * @param patterns - Map of pattern definitions keyed by pattern ID
 * @param staffPatterns - Map of staff pattern assignments
 * @returns Array of diagnostic summaries per staff member
 */
export function summariseDiagnostics(
  assignments: Assignment[],
  patterns: Record<string, PatternDefinition>,
  staffPatterns: Record<string, StaffPattern>
): StaffDiagnostics[] {
  console.log("📊 Calculating diagnostics for", Object.keys(staffPatterns).length, "staff members");
  
  const staffSummary: Record<string, { total: number; patternMatches: number }> = {};
  
  for (const assignment of assignments) {
    const { staffId, shiftCode, dayIndex } = assignment;
    
    // Initialize staff summary if not exists
    if (!staffSummary[staffId]) {
      staffSummary[staffId] = { total: 0, patternMatches: 0 };
    }
    
    staffSummary[staffId].total++;
    
    // Check pattern adherence if staff has a pattern assigned
    const staffPattern = staffPatterns[staffId];
    if (staffPattern && patterns[staffPattern.patternId]) {
      const pattern = patterns[staffPattern.patternId];
      const sequence = pattern.sequence;
      const offset = staffPattern.offset || 0;
      const cycleLength = pattern.cycleLength || sequence.length;
      
      // Calculate expected shift code for this day
      const patternIndex = (dayIndex + offset) % cycleLength;
      const expectedShift = sequence[patternIndex];
      
      // Check if actual matches expected
      if (expectedShift === shiftCode) {
        staffSummary[staffId].patternMatches++;
      }
    }
  }
  
  // Convert to array format with compliance percentage
  const diagnostics = Object.entries(staffSummary).map(([staffId, summary]) => ({
    staffId,
    totalShifts: summary.total,
    expectedShifts: summary.total,
    matchingShifts: summary.patternMatches,
    patternCompliance: summary.total > 0 
      ? Math.round((summary.patternMatches / summary.total) * 100) 
      : 0
  }));
  
  console.log("📊 Diagnostics summary:", diagnostics.length, "staff members analyzed");
  
  return diagnostics;
}

/**
 * Calculate overall roster compliance statistics
 */
export function calculateOverallCompliance(diagnostics: StaffDiagnostics[]) {
  if (diagnostics.length === 0) {
    return { avgCompliance: 0, totalShifts: 0, fullyCompliant: 0 };
  }
  
  const totalShifts = diagnostics.reduce((sum, d) => sum + d.totalShifts, 0);
  const totalMatching = diagnostics.reduce((sum, d) => sum + d.matchingShifts, 0);
  const avgCompliance = totalShifts > 0 ? Math.round((totalMatching / totalShifts) * 100) : 0;
  const fullyCompliant = diagnostics.filter(d => d.patternCompliance === 100).length;
  
  return { avgCompliance, totalShifts, fullyCompliant };
}
