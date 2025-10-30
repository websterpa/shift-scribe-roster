import type { CorrectiveResult } from '@/engine2/generators/correctiveRosterGenerator';
import type { PatternDuty } from '../patterns/generator';
import type { 
  RosterGenerationResult, 
  RosterGenerationResultUI,
  DistributionStats,
  StaffDistributionStats,
  Diagnostics,
  Assignment,
  EligibilityReason
} from '../types';
import { generatePatternLockedDuties, type PatternLockedInput } from '../patterns/generator';
import { supabase } from '@/integrations/supabase/client';

/**
 * Adapter functions to transform between engine types and application types
 * 
 * Bridges the gap between:
 * - Engine's CorrectiveResult (internal format)
 * - Application's RosterGenerationResult (UI-facing format)
 * - Pattern expansion results to roster assignments
 */

/**
 * Convert pattern expansion results to roster assignment format
 * 
 * @param patternExpansion - Array of pattern duties from pattern generator
 * @param siteId - Site identifier
 * @param tenantId - Tenant identifier
 * @returns Array of assignments ready for roster storage
 */
export function adaptPatternAssignments(
  patternExpansion: PatternDuty[],
  siteId: string,
  tenantId: string
): Assignment[] {
  console.log('✓ Adapter: Converting pattern expansion to assignments', {
    dutyCount: patternExpansion.length,
    siteId,
    tenantId
  });

  // Filter to only work shifts (E, L, N, D) and exclude rest/leave codes
  const workShifts = patternExpansion.filter(p => 
    ['E', 'L', 'N', 'D'].includes(p.shiftCode)
  );

  return workShifts.map(p => ({
    id: undefined,
    staff_id: p.staffId,
    date: p.date,
    shift_code: p.shiftCode as 'E' | 'L' | 'N' | 'D',
    site_id: siteId,
    tenant_id: tenantId,
  }));
}

/**
 * Generate and save pattern-locked roster
 * 
 * Orchestrates the full pattern-locked roster generation flow:
 * 1. Expands staff patterns over the date range
 * 2. Converts to assignment format
 * 3. Inserts into roster_assignments table
 * 
 * @param input - Pattern-locked generation parameters
 * @param versionId - Roster version ID for assignments
 * @param siteId - Site identifier
 * @param tenantId - Tenant identifier
 * @returns Generation result with assignments and warnings
 */
export async function generateAndSavePatternLockedRoster(
  input: PatternLockedInput,
  versionId: string,
  siteId: string,
  tenantId: string
): Promise<{ success: boolean; warnings: string[]; assignmentCount: number }> {
  console.log('🔒 Starting pattern-locked roster generation and save', {
    versionId,
    siteId,
    tenantId,
    staffCount: input.staffIds.length,
  });

  // Generate pattern duties
  const patternResult = await generatePatternLockedDuties(input);

  // Check for blocking errors
  if (patternResult.staffWithoutPatterns.length > 0) {
    console.error('❌ Generation blocked: Staff without patterns');
    return {
      success: false,
      warnings: patternResult.warnings,
      assignmentCount: 0,
    };
  }

  // Convert to assignments
  const assignments = adaptPatternAssignments(
    patternResult.duties,
    siteId,
    tenantId
  );

  // Add version_id to each assignment (tenant_id already present from adaptPatternAssignments)
  const assignmentsWithVersion = assignments.map(a => ({
    ...a,
    version_id: versionId,
    tenant_id: tenantId, // Ensure tenant_id is explicitly set
  }));

  console.log(`💾 Inserting ${assignmentsWithVersion.length} assignments into roster_assignments`);

  // Insert into database
  const { error } = await supabase
    .from('roster_assignments')
    .insert(assignmentsWithVersion);

  if (error) {
    console.error('❌ Failed to insert roster assignments:', error);
    throw new Error(`Failed to save roster assignments: ${error.message}`);
  }

  console.log('✅ Pattern-locked roster saved successfully');

  // Development diagnostics: Show per-staff assignment counts and pattern compliance
  if (import.meta.env.DEV) {
    console.groupCollapsed('🧮 Pattern-Locked Roster Diagnostics');
    console.log(`Total assignments inserted: ${assignmentsWithVersion.length}`);
    
    // Group assignments by staff
    const byStaff = assignmentsWithVersion.reduce((acc, a) => {
      const staffId = a.staff_id;
      if (!acc[staffId]) {
        acc[staffId] = [];
      }
      acc[staffId].push(a);
      return acc;
    }, {} as Record<string, typeof assignmentsWithVersion>);

    console.log('\n📊 Assignments per staff:');
    
    for (const [staffId, staffAssignments] of Object.entries(byStaff)) {
      // Extract shift pattern
      const pattern = staffAssignments.map(a => a.shift_code);
      const totalDays = staffAssignments.length;
      
      // Calculate shift type breakdown
      const shiftBreakdown = pattern.reduce((acc, shift) => {
        acc[shift] = (acc[shift] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Try to load staff's pattern from database for compliance check
      let compliance = 100; // Default to 100% if no pattern reference
      
      // Attempt to fetch pattern (non-blocking, best effort)
      try {
        const { data: staffPattern } = await supabase
          .from('site_patterns')
          .select('sequence')
          .eq('created_by', staffId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (staffPattern?.sequence) {
          const expectedPattern = Array.isArray(staffPattern.sequence) 
            ? staffPattern.sequence 
            : JSON.parse(staffPattern.sequence as string);
          
          // Calculate compliance: how many shifts match expected pattern
          const matches = pattern.filter((actualShift, index) => {
            const expectedIndex = index % expectedPattern.length;
            return actualShift === expectedPattern[expectedIndex];
          }).length;
          
          compliance = (matches / totalDays) * 100;
        }
      } catch (err) {
        // Pattern fetch failed, use default 100%
        console.debug(`Could not fetch pattern for staff ${staffId}:`, err);
      }

      console.log(`👤 Staff: ${staffId}`);
      console.log(`   • Assignments: ${totalDays}`);
      console.log(`   • Shift breakdown:`, shiftBreakdown);
      console.log(`   • Pattern compliance: ${compliance.toFixed(1)}%`);
    }

    // Calculate pattern coverage
    const totalDays = input.endDate ? 
      Math.ceil((new Date(input.endDate).getTime() - new Date(input.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1 :
      31; // Default to month
    const totalStaff = input.staffIds.length;
    const expectedWorkDays = totalDays * totalStaff;
    const coverageRate = (assignmentsWithVersion.length / expectedWorkDays) * 100;
    
    console.log(`\n✓ Overall coverage: ${coverageRate.toFixed(1)}%`);
    console.log(`  Total days: ${totalDays}`);
    console.log(`  Staff count: ${totalStaff}`);
    console.log(`  Work assignments: ${assignmentsWithVersion.length}`);
    console.log(`  Average assignments/staff: ${(assignmentsWithVersion.length / totalStaff).toFixed(1)}`);

    if (patternResult.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      patternResult.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    console.groupEnd();
  }

  return {
    success: true,
    warnings: patternResult.warnings,
    assignmentCount: assignmentsWithVersion.length,
  };
}

/**
 * Transform CorrectiveResult into the canonical RosterGenerationResult format
 * 
 * @param engineResult - Result from generateCorrectiveRoster
 * @param warnings - Optional array of warning messages
 * @returns Standardized roster generation result
 */
export function transformCorrectiveResult(
  engineResult: CorrectiveResult,
  warnings?: string[]
): RosterGenerationResult {
  console.log('✓ Adapter: Transforming CorrectiveResult to RosterGenerationResult');
  
  // Default diagnostics in case engine result is missing them
  const defaultDiagnostics: Diagnostics = {
    distributionStats: { byStaff: [], byShiftCode: {} }
  };

  // If no diagnostics from engine, return defaults
  if (!engineResult.diagnostics || !engineResult.diagnostics.distributionStats) {
    console.warn('⚠️ Adapter: Engine result missing diagnostics, using defaults');
    const assignments: Assignment[] = engineResult.assignments.map(a => ({
      id: undefined,
      date: a.dateISO,
      shift_code: a.shiftType as 'E' | 'L' | 'N' | 'D',
      staff_id: a.staffId,
    }));
    
    return {
      assignments,
      warnings: warnings || engineResult.violations,
      diagnostics: defaultDiagnostics,
    };
  }
  
  // Transform engine assignments to standard format
  const assignments: Assignment[] = engineResult.assignments.map(a => ({
    id: undefined,
    date: a.dateISO,
    shift_code: a.shiftType as 'E' | 'L' | 'N' | 'D',
    staff_id: a.staffId,
  }));

  // Transform distribution stats from engine format to standard format
  const distributionStats: DistributionStats = {
    byStaff: Object.entries(engineResult.diagnostics.distributionStats).map(([staffId, stats]) => ({
      staffId,
      staffName: undefined, // Engine doesn't provide names directly
      totalHours: stats.totalHours,
      totalShifts: 0, // Calculate from assignments if needed
      nights: stats.nights,
      weekendDays: stats.weekendDays,
    })),
    byShiftCode: {
      E: { count: engineResult.fairness.staffTotals ? Object.values(engineResult.fairness.staffTotals).reduce((sum, s) => sum + s.E, 0) : 0 },
      L: { count: engineResult.fairness.staffTotals ? Object.values(engineResult.fairness.staffTotals).reduce((sum, s) => sum + s.L, 0) : 0 },
      N: { count: engineResult.fairness.staffTotals ? Object.values(engineResult.fairness.staffTotals).reduce((sum, s) => sum + s.N, 0) : 0 },
      D: { count: engineResult.fairness.staffTotals ? Object.values(engineResult.fairness.staffTotals).reduce((sum, s) => sum + s.D, 0) : 0 },
    },
  };

  // Build constraint violations record
  const constraintViolations: Record<string, number> = {};
  if (engineResult.violations.length > 0) {
    engineResult.violations.forEach(v => {
      if (v.includes('rest')) constraintViolations.minRest = (constraintViolations.minRest || 0) + 1;
      if (v.includes('consecutive')) constraintViolations.maxConsec = (constraintViolations.maxConsec || 0) + 1;
    });
  }

  // Build diagnostics
  const diagnostics: Diagnostics = {
    distributionStats,
    fairnessScore: engineResult.fairness.variance 
      ? 100 - (engineResult.fairness.variance.E + engineResult.fairness.variance.L + engineResult.fairness.variance.N)
      : undefined,
    constraintViolations: Object.keys(constraintViolations).length > 0 ? constraintViolations : undefined,
    excludedStaff: engineResult.unfilledShifts?.length 
      ? engineResult.unfilledShifts
          .map(us => us.rejectionReasons)
          .flat()
          .filter((v, i, a) => a.indexOf(v) === i) // unique
          .map(reason => ({
            staffId: 'unknown',
            reasons: [{ code: 'other' as const, detail: reason }]
          }))
      : undefined,
  };

  console.log('✓ Adapter: Diagnostics populated', {
    staffCount: distributionStats.byStaff.length,
    violations: constraintViolations,
    fairnessScore: diagnostics.fairnessScore
  });

  return {
    assignments,
    warnings: warnings || engineResult.violations,
    diagnostics,
  };
}

/**
 * Transform CorrectiveResult into legacy UI result format
 * 
 * @param engineResult - Result from generateCorrectiveRoster
 * @param versionId - Optional version ID for navigation
 * @param budgetSet - Optional budget for variance calculation
 * @returns UI-facing roster generation result
 */
export function transformToUIResult(
  engineResult: CorrectiveResult,
  versionId?: string,
  budgetSet?: number,
  patternLocked?: boolean
): RosterGenerationResultUI {
  console.log('✓ Adapter: Transforming to UI result format');
  
  // Calculate fairness stats from engine fairness data
  const nightCounts = Object.values(engineResult.fairness.staffTotals).map(s => s.N);
  const fairnessStats = {
    nights: {
      min: Math.min(...nightCounts),
      avg: nightCounts.reduce((sum, n) => sum + n, 0) / nightCounts.length,
      max: Math.max(...nightCounts),
    },
    weekends: { min: 0, avg: 0, max: 0 }, // Engine doesn't track weekends yet
    publicHolidays: { min: 0, avg: 0, max: 0 }, // Engine doesn't track PH yet
  };

  // Calculate coverage achieved
  const totalRequired = Object.values(engineResult.coverage).reduce((sum, day) => 
    sum + day.E + day.L + day.N + day.D, 0
  );
  const totalAssigned = engineResult.assignments.length;
  const coveragePercent = totalRequired > 0 ? (totalAssigned / totalRequired) * 100 : 0;

  return {
    coverageAchieved: {
      total: Math.round(coveragePercent),
      byShift: {
        E: engineResult.coverage ? Object.values(engineResult.coverage).reduce((sum, day) => sum + day.E, 0) : 0,
        L: engineResult.coverage ? Object.values(engineResult.coverage).reduce((sum, day) => sum + day.L, 0) : 0,
        N: engineResult.coverage ? Object.values(engineResult.coverage).reduce((sum, day) => sum + day.N, 0) : 0,
        D: engineResult.coverage ? Object.values(engineResult.coverage).reduce((sum, day) => sum + day.D, 0) : 0,
      },
    },
    fairnessStats,
    cost: {
      total: 0, // Costing not yet integrated in engine
      budgetVariance: budgetSet ? -budgetSet : undefined,
    },
    violations: engineResult.violations,
    generatedVersionId: versionId,
    diagnostics: engineResult.diagnostics,
    patternLocked,
  };
}
