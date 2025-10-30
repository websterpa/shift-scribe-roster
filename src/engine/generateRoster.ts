/**
 * Atlas Roster Generator - Pattern-Based Assignment Engine
 * 
 * Generates roster assignments by applying staff-assigned shift patterns
 * from the site_patterns table.
 */

import { supabase } from "@/integrations/supabase/client";
import { createLogger } from "@/utils/errorLogger";
import { checkRestPeriods, checkWeeklyAverage, type ShiftRecord } from "@/engine/validators/wtd";
import { summariseDiagnostics, type StaffDiagnostics } from "@/engine/diagnostics";
import type { PatternDefinition, StaffPattern, Assignment } from "@/engine/diagnostics";
import { saveRoster, type RosterVersion } from "./persistRoster";
import { autoApplyCorrections } from "./corrective/autoApply";
import { balanceRoster, computeShiftScores } from "./balancer/fairness";

const logger = createLogger('AtlasRosterGenerator');

export interface GenerateRosterInput {
  tenantId: string;
  configId: string;
  siteId?: string;
  startDate: Date;
  endDate: Date;
  label?: string;
}

export interface RosterAssignment {
  staffId: string;
  staffName: string;
  dayIndex: number;
  date: Date;
  shift: string;
  patternId: string;
  shiftStart?: Date;
  shiftEnd?: Date;
  hours?: number;
  cost?: number;
  notes?: string;
}

export interface RosterDiagnostics {
  restViolations: Record<string, Array<{ day: string; gap: number; message: string }>>;
  weeklyAverageCompliant: Record<string, boolean>;
  avgHoursPerWeek: Record<string, number>;
  staffSummary: StaffDiagnostics[];
  overallCompliance: {
    avgCompliance: number;
    totalShifts: number;
    fullyCompliant: number;
  };
  autoApplied?: Array<{
    staffId: string;
    staffName: string;
    dayIndex: number;
    date: string;
    oldShift: string;
    newShift: string;
    reason: string;
    severity: 'critical' | 'warning' | 'info';
  }>;
  fairnessBalancing?: {
    appliedCount: number;
    historicalDataPoints: number;
  };
}

export interface RosterWithChecks {
  version: RosterVersion;
  roster: RosterAssignment[];
  diagnostics: RosterDiagnostics;
}

/**
 * Generate roster assignments based on staff patterns
 * 
 * @param input - Roster generation parameters
 * @returns Array of generated assignments
 */
export async function generateRoster(input: GenerateRosterInput): Promise<RosterAssignment[]> {
  const { tenantId, siteId, startDate, endDate } = input;
  
  console.log('[AtlasGenerator] Starting roster generation', {
    tenantId,
    siteId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });
  
  // 1. Load staff with their pattern assignments
  const { data: staff, error: staffError } = await supabase
    .from("staff_profiles")
    .select("id, first_name, last_name, pattern_id, pattern_offset")
    .eq("is_active", true)
    .not("pattern_id", "is", null);
  
  if (staffError) {
    logger.error(new Error('Failed to load staff'), { error: staffError });
    throw new Error(`Failed to load staff: ${staffError.message}`);
  }
  
  if (!staff || staff.length === 0) {
    console.warn('[AtlasGenerator] No staff found with assigned patterns');
    return [];
  }
  
  console.log(`[AtlasGenerator] Loaded ${staff.length} staff members with patterns`);
  
  // 2. Load all shift patterns
  const patternIds = [...new Set(staff.map(s => s.pattern_id).filter(Boolean))] as string[];
  
  const { data: patterns, error: patternsError } = await supabase
    .from("site_patterns")
    .select("id, name, sequence, cycle_length, system")
    .in("id", patternIds);
  
  if (patternsError) {
    logger.error(new Error('Failed to load patterns'), { error: patternsError });
    throw new Error(`Failed to load patterns: ${patternsError.message}`);
  }
  
  if (!patterns || patterns.length === 0) {
    console.warn('[AtlasGenerator] No patterns found for staff');
    return [];
  }
  
  // Build pattern lookup map with proper type conversion
  const patternMap = Object.fromEntries(
    patterns.map(p => {
      // Convert sequence from Json to string array
      const sequence = Array.isArray(p.sequence) 
        ? p.sequence.filter((item): item is string => typeof item === 'string')
        : [];
      
      return [
        p.id,
        {
          id: p.id,
          name: p.name,
          sequence,
          cycle_length: p.cycle_length,
          system: p.system,
        }
      ];
    })
  );
  
  console.log(`[AtlasGenerator] Loaded ${patterns.length} patterns:`, 
    patterns.map(p => ({ id: p.id, name: p.name, system: p.system }))
  );
  
  // 3. Generate day-by-day shifts
  const roster: RosterAssignment[] = [];
  const totalDays = Math.floor(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  
  for (const member of staff) {
    const pattern = patternMap[member.pattern_id!];
    if (!pattern) {
      console.warn(`[AtlasGenerator] Pattern not found for staff ${member.id}`);
      continue;
    }
    
    const sequence = pattern.sequence;
    const cycleLength = pattern.cycle_length || sequence.length;
    const offset = member.pattern_offset || 0;
    
    for (let day = 0; day < totalDays; day++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      
      // Calculate position in pattern (with offset)
      const patternIndex = (day + offset) % cycleLength;
      const code = sequence[patternIndex];
      
      // Skip rest days and invalid codes
      if (!code || code === "R") {
        continue;
      }
      
      roster.push({
        staffId: member.id,
        staffName: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
        dayIndex: day,
        date,
        shift: code,
        patternId: pattern.id,
      });
    }
  }
  
  console.log(`[AtlasGenerator] Generated ${roster.length} assignments across ${staff.length} staff`);
  
  // Log shift type distribution
  const shiftCounts = roster.reduce((acc, a) => {
    acc[a.shift] = (acc[a.shift] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('[AtlasGenerator] Shift distribution:', shiftCounts);
  
  return roster;
}

/**
 * Generate roster with WTD validation and diagnostics
 * 
 * @param input - Roster generation parameters
 * @returns Roster assignments with compliance diagnostics
 */
export async function generateRosterWithChecks(
  input: GenerateRosterInput
): Promise<RosterWithChecks> {
  console.log('🚀 [AtlasGenerator] Starting roster generation with validation checks');
  
  // 1. Generate base roster
  const roster = await generateRoster(input);
  
  if (roster.length === 0) {
    console.warn('⚠️ [AtlasGenerator] No assignments generated');
    
    // Still create a version for empty roster
    const version = await saveRoster({
      tenantId: input.tenantId,
      roster: [],
      configId: input.configId,
      label: input.label || 'Empty Roster'
    });
    
    return {
      version,
      roster: [],
      diagnostics: {
        restViolations: {},
        weeklyAverageCompliant: {},
        avgHoursPerWeek: {},
        staffSummary: [],
        overallCompliance: { avgCompliance: 0, totalShifts: 0, fullyCompliant: 0 }
      }
    };
  }
  
  // 2. Load pattern data for diagnostics
  const { data: patterns } = await supabase
    .from("site_patterns")
    .select("id, sequence, cycle_length");
  
  const patternMap: Record<string, PatternDefinition> = {};
  if (patterns) {
    for (const p of patterns) {
      const sequence = Array.isArray(p.sequence)
        ? p.sequence.filter((item): item is string => typeof item === 'string')
        : [];
      patternMap[p.id] = {
        id: p.id,
        sequence,
        cycleLength: p.cycle_length || sequence.length
      };
    }
  }
  
  // 3. Build staff pattern map
  const { data: staff } = await supabase
    .from("staff_profiles")
    .select("id, pattern_id, pattern_offset")
    .eq("is_active", true)
    .not("pattern_id", "is", null);
  
  const staffPatternMap: Record<string, StaffPattern> = {};
  if (staff) {
    for (const s of staff) {
      if (s.pattern_id) {
        staffPatternMap[s.id] = {
          staffId: s.id,
          patternId: s.pattern_id,
          offset: s.pattern_offset || 0
        };
      }
    }
  }
  
  // 4. Convert roster to diagnostics format
  const diagnosticAssignments: Assignment[] = roster.map(a => ({
    staffId: a.staffId,
    date: a.date.toISOString().split('T')[0],
    shiftCode: a.shift,
    dayIndex: a.dayIndex
  }));
  
  // 5. Run pattern adherence diagnostics
  console.log('📊 [AtlasGenerator] Running pattern adherence analysis');
  const staffSummary = summariseDiagnostics(diagnosticAssignments, patternMap, staffPatternMap);
  
  const totalShifts = staffSummary.reduce((sum, s) => sum + s.totalShifts, 0);
  const totalMatching = staffSummary.reduce((sum, s) => sum + s.matchingShifts, 0);
  const avgCompliance = totalShifts > 0 ? Math.round((totalMatching / totalShifts) * 100) : 0;
  const fullyCompliant = staffSummary.filter(s => s.patternCompliance === 100).length;
  
  // 6. Run WTD validation per staff member
  console.log('⚖️ [AtlasGenerator] Running WTD compliance checks');
  const restViolations: Record<string, Array<{ day: string; gap: number; message: string }>> = {};
  const weeklyAverageCompliant: Record<string, boolean> = {};
  const avgHoursPerWeek: Record<string, number> = {};
  
  // Group assignments by staff
  const staffAssignments = roster.reduce((acc, a) => {
    if (!acc[a.staffId]) acc[a.staffId] = [];
    acc[a.staffId].push(a);
    return acc;
  }, {} as Record<string, RosterAssignment[]>);
  
  for (const [staffId, assignments] of Object.entries(staffAssignments)) {
    // Convert to ShiftRecords
    const shiftRecords: ShiftRecord[] = assignments.map(a => {
      const shiftTimes = getDefaultShiftTimes(a.shift);
      const start = new Date(`${a.date.toISOString().split('T')[0]}T${shiftTimes.start}`);
      let end = new Date(`${a.date.toISOString().split('T')[0]}T${shiftTimes.end}`);
      
      // Handle overnight shifts
      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }
      
      return { staffId, start, end };
    });
    
    // Check rest periods
    restViolations[staffId] = checkRestPeriods(shiftRecords);
    
    // Check weekly average
    weeklyAverageCompliant[staffId] = checkWeeklyAverage(shiftRecords);
    
    // Calculate average hours
    const totalMs = shiftRecords.reduce((sum, r) => 
      sum + (r.end.getTime() - r.start.getTime()), 0
    );
    const totalHours = totalMs / (1000 * 60 * 60);
    const sorted = [...shiftRecords].sort((a, b) => a.start.getTime() - b.start.getTime());
    const spanMs = sorted.length > 0
      ? sorted[sorted.length - 1].end.getTime() - sorted[0].start.getTime()
      : 0;
    const spanWeeks = Math.max(spanMs / (1000 * 60 * 60 * 24 * 7), 17);
    avgHoursPerWeek[staffId] = parseFloat((totalHours / spanWeeks).toFixed(1));
  }
  
  // 7. Log summary
  const totalViolations = Object.values(restViolations).reduce((sum, v) => sum + v.length, 0);
  const compliantStaff = Object.values(weeklyAverageCompliant).filter(c => c).length;
  
  console.log('✅ [AtlasGenerator] Validation complete:', {
    totalAssignments: roster.length,
    patternCompliance: `${avgCompliance}%`,
    restViolations: totalViolations,
    wtdCompliantStaff: `${compliantStaff}/${Object.keys(weeklyAverageCompliant).length}`
  });
  
  // 8. Auto-apply safe corrections
  console.log('🔧 [AtlasGenerator] Applying automatic corrections...');
  const initialDiagnostics: RosterDiagnostics = {
    restViolations,
    weeklyAverageCompliant,
    avgHoursPerWeek,
    staffSummary,
    overallCompliance: { avgCompliance, totalShifts, fullyCompliant }
  };
  
  const { roster: correctedRoster, changelog } = autoApplyCorrections(roster, initialDiagnostics);
  
  if (changelog.length > 0) {
    console.log(`✅ [AtlasGenerator] Applied ${changelog.length} automatic corrections:`, 
      changelog.map(c => ({ staff: c.staffName, change: `${c.oldShift} → ${c.newShift}` }))
    );
  } else {
    console.log('✅ [AtlasGenerator] No automatic corrections needed');
  }
  
  // 9. Apply AI fairness balancing
  console.log('⚖️ [AtlasGenerator] Applying AI fairness balancing...');
  
  // Load historical roster data for fairness analysis (last 3 months)
  const threeMonthsAgo = new Date(input.startDate);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const { data: historicalAssignments } = await supabase
    .from('roster_assignments')
    .select(`
      staff_id,
      date,
      shift_code,
      staff_profiles!inner(first_name, last_name)
    `)
    .gte('date', threeMonthsAgo.toISOString().split('T')[0])
    .lt('date', input.startDate.toISOString().split('T')[0]);
  
  // Convert to RosterAssignment format
  const historicalRoster: RosterAssignment[] = (historicalAssignments || []).map((a: any) => ({
    staffId: a.staff_id,
    staffName: `${a.staff_profiles?.first_name || ''} ${a.staff_profiles?.last_name || ''}`.trim(),
    dayIndex: 0,
    date: new Date(a.date),
    shift: a.shift_code,
    patternId: 'historical'
  }));
  
  logger.info('[AtlasGenerator] Loaded historical data', {
    records: historicalRoster.length,
    dateRange: `${threeMonthsAgo.toISOString().split('T')[0]} to ${input.startDate.toISOString().split('T')[0]}`
  });
  
  // Apply fairness balancing
  const balancedRoster = balanceRoster(correctedRoster, historicalRoster);
  
  // Log fairness analysis
  if (historicalRoster.length > 0) {
    const analysis = computeShiftScores(historicalRoster);
    console.log('📊 [AtlasGenerator] Fairness analysis:', {
      averageLoad: analysis.averageLoad,
      staffAnalyzed: Object.keys(analysis.staffScores).length,
      adjustmentsNeeded: analysis.adjustmentsNeeded
    });
  }
  
  const fatiguePreventionCount = balancedRoster.filter(a => a.notes?.includes('Fatigue prevention')).length;
  if (fatiguePreventionCount > 0) {
    console.log(`✅ [AtlasGenerator] Applied ${fatiguePreventionCount} fatigue prevention adjustments`);
  }
  
  // 10. Persist roster to database with tenant isolation
  console.log('💾 [AtlasGenerator] Persisting roster to database...');
  const version = await saveRoster({
    tenantId: input.tenantId,
    roster: balancedRoster,
    configId: input.configId,
    label: input.label || 'Auto-Generated'
  });
  
  console.log(`✅ [AtlasGenerator] Roster saved as version ${version.version_number}`);
  
  return {
    version,
    roster: balancedRoster,
    diagnostics: {
      restViolations,
      weeklyAverageCompliant,
      avgHoursPerWeek,
      staffSummary,
      overallCompliance: { avgCompliance, totalShifts, fullyCompliant },
      autoApplied: changelog,
      fairnessBalancing: {
        appliedCount: fatiguePreventionCount,
        historicalDataPoints: historicalRoster.length
      }
    }
  };
}

/**
 * Get default shift times based on shift code
 */
function getDefaultShiftTimes(shiftCode: string): { start: string; end: string } {
  const times: Record<string, { start: string; end: string }> = {
    'E': { start: '06:00:00', end: '14:00:00' },
    'L': { start: '14:00:00', end: '22:00:00' },
    'N': { start: '22:00:00', end: '06:00:00' },
    'D': { start: '08:00:00', end: '20:00:00' }, // 12-hour day
  };
  
  return times[shiftCode] || { start: '08:00:00', end: '16:00:00' };
}
