import { supabase } from "@/integrations/supabase/client";
import type { StaffMember } from "@/types/roster";
import {
  generateCorrectiveRoster,
  type CorrectiveStaffMember,
  type CoverageRequirements,
  type CorrectiveResult,
  DEFAULT_CORRECTIVE_POLICY,
  transformToUIResult
} from "@/features/roster/engine";
import { remapToFramework } from "@/features/roster/shiftMap";
import { toast } from "@/hooks/use-toast";
import { createLogger } from "@/utils/errorLogger";
import { safeSelect, safeInsert } from "@/integrations/supabase/safeQuery";
import { 
  assignmentsToShiftRecords, 
  validateWTDCompliance 
} from "@/engine/validators/wtd";
import { autoApplyCorrections } from '@/engine/corrective/autoApply';
import { balanceRoster } from '@/engine/balancer/fairness';
import { getTenantId } from '@/features/tenant/useTenant';

const logger = createLogger('GenerateAndSaveRoster');

/**
 * Backward-compatible wrapper for generateRoster
 * Used by wizard and legacy components
 */
export async function generateAndSaveRoster(
  staffList: StaffMember[],
  config: any, // Accept any config format for backward compatibility
  versionName?: string,
  automationOptions?: { autoCorrect?: boolean; aiBalance?: boolean }
): Promise<{
  versionId: string;
  totalAssignments: number;
  optimizationResult?: { score: number };
  wtrResult?: { violations: unknown[] };
  costResult?: { totalCost: number; averageCost: number; breakdown: Record<string, unknown> };
  generatorResult?: CorrectiveResult;
  patternLocked?: boolean;
  autoCorrectionsApplied?: number;
  aiBalancingApplied?: number;
  perfMetrics?: {
    fetchMs: number;
    genMs: number;
    insertMs: number;
    totalMs: number;
  };
}> {
  const perfStart = performance.now();
  let genStartTime = 0;
  let genEndTime = 0;
  let insertStartTime = 0;
  let insertEndTime = 0;
  
  const tenantId = getTenantId(); // Get tenant ID for isolation
  
  // Extract config properties - handle both new and legacy formats
  const configId = config.configId || config.id;
  const monthISO = config.monthISO || config.start_date?.substring(0, 7);
  const versionNameToUse = versionName || config.versionName || config.config_name;
  const shiftSystem = config.shift_type || '8h'; // Driven by wizard UI selection
  
  console.log('[RosterEngine] using helpers from services/roster/helpers');
  logger.info('generateAndSaveRoster called', { configId, monthISO, shiftSystem });
  
  if (!configId || !monthISO) {
    throw new Error("configId and monthISO are required");
  }

  // DEDUPLICATION: Collapse duplicate staff records differing only by case/spacing
  const norm = (v: string) => v.trim().toLowerCase();
  const keyFor = (s: StaffMember) => 
    s.email ? norm(s.email) : norm(`${s.first_name || ''} ${s.last_name || ''}`);
  
  const dedupMap: Record<string, StaffMember> = {};
  for (const s of staffList) {
    const key = keyFor(s);
    // Keep the first occurrence of each unique staff member
    if (!dedupMap[key]) {
      dedupMap[key] = s;
    }
  }
  const dedupedStaffList = Object.values(dedupMap);
  
  console.info("[DEDUP] raw:", staffList.length, "deduped:", dedupedStaffList.length);
  logger.info('Staff deduplication', { 
    raw: staffList.length, 
    deduped: dedupedStaffList.length,
    duplicatesRemoved: staffList.length - dedupedStaffList.length 
  });

  // Use deduplicated staff list for all subsequent operations
  const staffIds = dedupedStaffList.map(s => s.id);

  // Clear old assignments for this month before generating new ones
  {
    const [yr, mon] = monthISO.split('-').map(Number);
    const days = new Date(yr, mon, 0).getDate();
    const monthStart = `${monthISO}-01`;
    const monthEnd = `${monthISO}-${String(days).padStart(2, '0')}`;
    
    const { error: deleteError } = await supabase
      .from('roster_assignments')
      .delete()
      .gte('date', monthStart)
      .lte('date', monthEnd);
    
    if (deleteError) {
      logger.error(new Error('Failed to clear old assignments'), { error: deleteError, monthISO });
      throw new Error(`Failed to clear old assignments: ${deleteError.message}`);
    }
    
    logger.info('Cleared old assignments for month', { monthISO, dateRange: `${monthStart} to ${monthEnd}` });
  }

  // Create roster version with version_number
  const { data: existingVersions } = await safeSelect<any[]>(
    supabase
      .from('roster_versions')
      .select('version_number')
      .eq('config_id', configId)
      .order('version_number', { ascending: false })
      .limit(1),
    'roster versions'
  );
  
  const nextVersionNumber = (existingVersions && existingVersions[0]) 
    ? existingVersions[0].version_number + 1 
    : 1;

  const { data: versionData, error: versionError } = await safeInsert<any>(
    supabase
      .from('roster_versions')
      .insert({
        config_id: configId,
        tenant_id: tenantId,
        version_name: versionNameToUse || `Version ${Date.now()}`,
        version_number: nextVersionNumber,
      })
      .select()
      .single(),
    'roster version'
  );

  if (versionError || !versionData) {
    return Promise.reject(versionError);
  }

  logger.info('Created roster version', { versionId: versionData.id });

  // Fetch roster config to get coverage requirements
  const { data: configData, error: configError } = await safeSelect<any>(
    supabase
      .from('roster_config')
      .select('*')
      .eq('id', configId)
      .single(),
    'roster config'
  );

  if (configError || !configData) {
    return Promise.reject(configError);
  }

  // Build days array for the month
  const [year, month] = monthISO.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(`${monthISO}-${String(day).padStart(2, '0')}`);
  }

  // Convert deduplicated staff list to CorrectiveStaffMember format
  // PERMISSIVE ELIGIBILITY: Empty/null eligible_shifts means eligible for all shifts
  const correctiveStaff: CorrectiveStaffMember[] = dedupedStaffList.map(s => {
    const hasShiftsConfigured = s.eligible_shifts && s.eligible_shifts.length > 0;
    const isNightEligible = hasShiftsConfigured 
      ? s.eligible_shifts.includes('Night') || s.eligible_shifts.includes('N')
      : true; // Default to night-eligible if no shifts configured
    
    return {
      id: s.id,
      name: s.name || `${s.first_name} ${s.last_name}`,
      availability: {}, // All days available by default
      isNightEligible,
      wtd_opt_out: s.wtd_opt_out ?? s.opted_out_wtd ?? true, // Include WTD opt-out status (default true)
    };
  });
  
  console.info("[STAFF-POOL] ✅ Final eligible staff pool:", correctiveStaff.length, "members");
  console.info("[STAFF-POOL] Night-eligible:", correctiveStaff.filter(s => s.isNightEligible).length);
  logger.info('Staff pool prepared for generation', {
    total: correctiveStaff.length,
    nightEligible: correctiveStaff.filter(s => s.isNightEligible).length
  });

  // Default-open availability: all staff available for all days unless explicitly unavailable
  // This ensures newly activated staff are immediately schedulable; admins can refine later
  correctiveStaff.forEach(s => {
    let hasAvailabilitySet = false;
    
    // Check if any availability was explicitly set (future: check DB for explicit records)
    for (const d of days) {
      if (s.availability[d] !== undefined) {
        hasAvailabilitySet = true;
        break;
      }
    }
    
    // Apply default-open availability for all days
    days.forEach(d => {
      if (s.availability[d] === undefined) {
        s.availability[d] = true;
      }
    });
    
    // Log when defaults are applied
    if (!hasAvailabilitySet) {
      console.info("[AVAIL-DEFAULT] applied for", s.name, `(${days.length} days available)`);
    }
  });

  // GUARDRAIL: Block generation if staff pool is too small
  const EXPECTED_MIN_STAFF = 11; // TODO: Move to settings
  if (correctiveStaff.length < EXPECTED_MIN_STAFF) {
    const errorMsg = `Cannot generate roster: only ${correctiveStaff.length}/${EXPECTED_MIN_STAFF} eligible staff found. Go to Settings → Staff and ensure more team members have 'active' availability status.`;
    console.error("[BLOCK] ❌ Eligible staff below expected threshold", {
      found: correctiveStaff.length,
      expected: EXPECTED_MIN_STAFF,
      names: correctiveStaff.map(s => s.name),
    });
    logger.error(new Error('Insufficient staff pool'), {
      found: correctiveStaff.length,
      expected: EXPECTED_MIN_STAFF,
      availableStaff: correctiveStaff.map(s => s.name)
    });
    throw new Error(errorMsg);
  }
  
  console.info("[STAFF-POOL] ✅ Sufficient staff pool:", correctiveStaff.length, "≥", EXPECTED_MIN_STAFF);

  // Parse coverage requirements from config
  const requirements: CoverageRequirements = {};
  const staffingReqs = configData.staffing_requirements || {};
  
  days.forEach(dateISO => {
    const jsDay = new Date(dateISO + 'T00:00:00').getDay();
    const dayOfWeek = String(jsDay); // 0=Sunday, 6=Saturday
    const dayReqs = staffingReqs[dayOfWeek] || {};
    
    requirements[dateISO] = {
      E: (dayReqs.E ?? 2), // Default 2 early shifts, respect 0
      L: (dayReqs.L ?? 1), // Default 1 late shift, respect 0
      N: (dayReqs.N ?? 1), // Default 1 night shift, respect 0
    };
  });

  // FRAMEWORK REMAPPING: Convert E/L → D when 12h mode is selected
  let remappingOccurred = false;
  if (shiftSystem === '12h') {
    days.forEach(dateISO => {
      const dayReqs = requirements[dateISO];
      const codes = Object.keys(dayReqs);
      const remapped = remapToFramework(codes, '12h');
      
      // Check if remapping occurred
      if (codes.some((c, i) => c !== remapped[i])) {
        remappingOccurred = true;
      }
      
      // Rebuild requirements with remapped codes
      const newReqs: Record<string, number> = {};
      codes.forEach((code, i) => {
        const remappedCode = remapped[i];
        newReqs[remappedCode] = (newReqs[remappedCode] || 0) + (dayReqs as any)[code];
      });
      
      requirements[dateISO] = newReqs as any;
    });
    
    // Show one-time info toast if remapping occurred
    if (remappingOccurred) {
      toast({
        title: "12-hour mode active",
        description: "Early and Late shifts were remapped to Day shifts.",
        variant: "default",
      });
      logger.info('Remapped E/L → D for 12h framework', { shiftSystem });
    }
  }

  // VALIDATION: Ensure requirements only use valid shift type keys
  const validShiftTypes = shiftSystem === '12h' 
    ? new Set(['D', 'N']) 
    : new Set(['E', 'L', 'N']);
    
  days.forEach((dateISO, dayIndex) => {
    const dayReqs = requirements[dateISO];
    const keys = Object.keys(dayReqs);
    
    for (const key of keys) {
      const normalized = key.trim().toUpperCase();
      
      // Check if normalized key is valid for the selected framework
      if (!validShiftTypes.has(normalized)) {
        const allowedShifts = shiftSystem === '12h' ? 'D/N' : 'E/L/N';
        throw new Error(
          `Invalid requirement key "${key}" on day ${dayIndex + 1} (${dateISO}). ` +
          `Only ${allowedShifts} are allowed in ${shiftSystem} mode.`
        );
      }
      
      // Normalize key if needed (case/whitespace cleanup)
      if (normalized !== key) {
        logger.warn(`Normalizing requirement key "${key}" → "${normalized}" on ${dateISO}`);
        (dayReqs as any)[normalized] = (dayReqs as any)[key];
        delete (dayReqs as any)[key];
      }
    }
  });

  logger.info('Requirements validated', { daysCount: days.length });
  
  // GUARDRAIL: Block zero-staff requirements for active shift types
  // This prevents false data and roster generation failures
  const activeCodes = Array.from(validShiftTypes);
  const sampleDay = days[0];
  const sampleReqs = requirements[sampleDay];
  const zeros = activeCodes.filter(code => (sampleReqs as any)[code] <= 0);
  
  if (zeros.length > 0) {
    const errorMsg = `Invalid staffing requirements: All active shift types must have ≥ 1 staff assigned. Zero-staff shifts detected: ${zeros.join(', ')} (${shiftSystem} mode requires ${activeCodes.join('/')})`;
    console.error("[BLOCK] ❌ Zero-staff requirements detected", {
      shiftSystem,
      activeCodes,
      zeros,
      sampleReqs
    });
    logger.error(new Error('Zero-staff requirements'), {
      shiftSystem,
      activeCodes,
      zeros,
      sampleDate: sampleDay,
      requirements: sampleReqs
    });
    throw new Error(errorMsg);
  }
  
  console.info("[REQUIREMENTS] ✅ All active shift types have ≥ 1 staff required");
  logger.info('Requirements validated (no zero-staff shifts)', { shiftSystem, activeCodes });

  // Diagnostic logging for staff pool and configuration
  console.info("[DIAG] staff.count", correctiveStaff.length);
  console.info("[DIAG] staff.names", correctiveStaff.map(s => s.name));
  console.info("[DIAG] availability.sample", correctiveStaff.slice(0, 3).map(s => ({
    name: s.name, 
    daysAvail: Object.values(s.availability).filter(Boolean).length 
  })));
  console.info("[DIAG] requirements", requirements);
  console.info("[DIAG] policy", DEFAULT_CORRECTIVE_POLICY);

  logger.info('Generating roster with corrective engine', { 
    staffCount: correctiveStaff.length,
    daysCount: days.length,
    sampleRequirements: requirements[days[0]],
    patternLocked: config.patternLocked
  });

  let result: CorrectiveResult;

  // PATTERN-LOCKED MODE: Use staff-specific pattern expansion
  if (config.patternLocked) {
    logger.info('🔒 Pattern-locked mode enabled - generating from staff patterns');
    
    // Log which staff have patterns assigned
    const staffWithPatterns = dedupedStaffList.filter(s => s.pattern_id);
    const staffWithoutPatterns = dedupedStaffList.filter(s => !s.pattern_id);
    
    console.group('🎯 Pattern Assignment Status');
    console.log(`✅ Staff with patterns: ${staffWithPatterns.length}`);
    staffWithPatterns.forEach(s => {
      console.log(`   - ${s.first_name} ${s.last_name}: pattern ${s.pattern_id}, offset ${s.pattern_offset || 0}`);
    });
    if (staffWithoutPatterns.length > 0) {
      console.warn(`⚠️ Staff without patterns: ${staffWithoutPatterns.length}`);
      staffWithoutPatterns.forEach(s => {
        console.warn(`   - ${s.first_name} ${s.last_name}: NO PATTERN ASSIGNED`);
      });
    }
    console.groupEnd();
    
    // Step 1: Read and increment cycle index for rotation fairness
    const currentCycleIndex = configData.cycle_index ?? 0;
    const nextCycleIndex = currentCycleIndex + 1;
    
    logger.info('🔄 Applying fairness rotation', {
      currentCycle: currentCycleIndex,
      nextCycle: nextCycleIndex,
    });
    
    // Update cycle index in database for next generation
    await supabase
      .from('roster_config')
      .update({ cycle_index: nextCycleIndex })
      .eq('id', configId);
    
    // Step 2: Apply rotation offset to staff patterns
    // This rotates unpopular shifts across staff over multiple periods
    const rotationOffset = currentCycleIndex % 8; // Assume max pattern length ~8
    
    // OPTIMIZATION: Parallelize pattern fetching and staff updates
    const staffForRotation = dedupedStaffList.filter(s => s.pattern_id);
    
    if (staffForRotation.length > 0) {
      // Bulk fetch all patterns at once
      const uniquePatternIds = [...new Set(staffForRotation.map(s => s.pattern_id!))];
      const { data: patternsData } = await supabase
        .from('site_patterns')
        .select('id, sequence')
        .in('id', uniquePatternIds);
      
      const patternLengthMap = new Map<string, number>();
      if (patternsData) {
        patternsData.forEach(p => {
          const length = Array.isArray(p.sequence) ? p.sequence.length : 8;
          patternLengthMap.set(p.id, length);
        });
      }
      
      console.log(`📦 Bulk loaded ${patternLengthMap.size} pattern lengths for rotation`);
      
      // Parallelize staff offset updates
      await Promise.all(
        staffForRotation.map(async (staff) => {
          const patternLength = patternLengthMap.get(staff.pattern_id!) || 8;
          
          // Calculate rotated offset
          const baseOffset = staff.pattern_offset ?? 0;
          const rotatedOffset = (baseOffset + rotationOffset) % patternLength;
          
          // Update staff pattern offset in database
          await supabase
            .from('staff_profiles')
            .update({ pattern_offset: rotatedOffset })
            .eq('id', staff.id);
          
          // Update local copy
          staff.pattern_offset = rotatedOffset;
          
          logger.info(`Rotated offset for staff ${staff.id}:`, {
            base: baseOffset,
            rotation: rotationOffset,
            final: rotatedOffset,
            patternLength,
          });
        })
      );
      
      console.log(`✅ Parallelized rotation for ${staffForRotation.length} staff members`);
    }
    
    // Import pattern allocation utilities
    const { patternAllocator } = await import('@/features/roster/engine2/allocators/patternAllocator');
    const { autoDistributePatternOffsets } = await import('@/utils/patternOffsetDistributor');
    
    // Auto-distribute offsets for staff without manual offsets (respects manually-set values)
    logger.info('🔄 Auto-distributing pattern offsets for balanced team rotation');
    await autoDistributePatternOffsets(dedupedStaffList, supabase, true);
    
    // Step 3: Generate duties from rotated patterns using pattern allocator
    const rosterStart = new Date(days[0] + 'T00:00:00');
    const rosterEnd = new Date(days[days.length - 1] + 'T23:59:59');
    
    logger.info('🎯 Calling patternAllocator', {
      rosterStart: rosterStart.toISOString(),
      rosterEnd: rosterEnd.toISOString(),
      staffCount: dedupedStaffList.length,
    });
    
    genStartTime = performance.now();
    const patternAssignments = await patternAllocator({
      rosterStart,
      rosterEnd,
      staff: dedupedStaffList.map(s => ({
        id: s.id,
        pattern_id: s.pattern_id,
        pattern_offset: s.pattern_offset,
        opted_out_wtd: s.opted_out_wtd,
        wtd_opt_out: s.wtd_opt_out,
        first_name: s.first_name,
        last_name: s.last_name,
      })),
      supabase,
    });
    genEndTime = performance.now();
    
    logger.info(`Pattern allocation complete`, {
      assignmentsCount: patternAssignments.length,
    });
    
    // SAFEGUARD: Fallback to coverage-first if no pattern assignments generated
    if (patternAssignments.length === 0) {
      logger.warn('⚠️ Pattern allocator returned 0 assignments, falling back to coverage-first mode');
      toast({
        title: "Pattern Allocation Empty",
        description: "No staff have patterns assigned. Falling back to coverage-first allocation.",
        variant: "destructive",
      });
      
      // Generate using coverage-first mode as fallback
      result = generateCorrectiveRoster({
        days,
        staff: correctiveStaff,
        requirements,
        policy: DEFAULT_CORRECTIVE_POLICY,
      });
      
      logger.info('Fallback to coverage-first complete', {
        assignmentsCount: result.assignments.length
      });
    } else {
      // Convert PatternAssignment[] to CorrectiveResult format for downstream compatibility
      const assignmentsByDate: Record<string, Array<{ staffId: string; shiftCode: string }>> = {};
      patternAssignments.forEach(assignment => {
        const dateISO = assignment.date.toISOString().split('T')[0];
        if (!assignmentsByDate[dateISO]) {
          assignmentsByDate[dateISO] = [];
        }
        assignmentsByDate[dateISO].push({ 
          staffId: assignment.staff_id, 
          shiftCode: assignment.shift_code 
        });
      });
      
      // Calculate coverage
      const coverage: Record<string, { E: number; L: number; N: number; D: number }> = {};
      days.forEach(dateISO => {
        const dayAssignments = assignmentsByDate[dateISO] || [];
        coverage[dateISO] = {
          E: dayAssignments.filter(a => a.shiftCode === 'E').length,
          L: dayAssignments.filter(a => a.shiftCode === 'L').length,
          N: dayAssignments.filter(a => a.shiftCode === 'N').length,
          D: dayAssignments.filter(a => a.shiftCode === 'D').length,
        };
      });
      
      // Calculate staff totals
      const staffTotals: Record<string, { E: number; L: number; N: number; D: number; total: number }> = {};
      patternAssignments.forEach(assignment => {
        if (!staffTotals[assignment.staff_id]) {
          staffTotals[assignment.staff_id] = { E: 0, L: 0, N: 0, D: 0, total: 0 };
        }
        const key = assignment.shift_code as 'E' | 'L' | 'N' | 'D';
        staffTotals[assignment.staff_id][key]++;
        staffTotals[assignment.staff_id].total++;
      });
      
      
      const staffIdsWithPatterns = new Set(patternAssignments.map(a => a.staff_id));
      const staffWithoutPatterns = dedupedStaffList.filter(s => !staffIdsWithPatterns.has(s.id));
      
      // Show warnings if any staff lack patterns
      if (staffWithoutPatterns.length > 0) {
        toast({
          title: "Staff Without Patterns",
          description: `${staffWithoutPatterns.length} staff members have no pattern assigned and were skipped.`,
          variant: "destructive",
        });
      }
      
      // Build result in CorrectiveResult format
      result = {
        assignments: patternAssignments.map(assignment => ({
          staffId: assignment.staff_id,
          dateISO: assignment.date.toISOString().split('T')[0],
          shiftType: assignment.shift_code as 'E' | 'L' | 'N' | 'D'
        })),
        roster: {}, // Not needed for pattern-locked mode
        coverage,
        fairness: {
          staffTotals,
          targets: { E: 0, L: 0, N: 0, D: 0 }, // Not relevant for pattern-locked
          variance: { E: 0, L: 0, N: 0, D: 0 }
        },
        violations: [],
        utilizationReport: Object.fromEntries(
          Object.entries(staffTotals).map(([id, totals]) => [id, totals.total])
        ),
        diagnostics: {
          staffPoolCount: correctiveStaff.length,
          staffUsedCount: staffIdsWithPatterns.size,
          distributionStats: {},
          patternAdherence: []
        }
      };
      
      logger.info('Pattern-locked roster generation complete', {
        assignmentsCount: result.assignments.length,
        staffUsed: result.diagnostics.staffUsedCount
      });
      
      // 🧮 PATTERN COMPLIANCE DIAGNOSTICS (Always enabled for pattern mode)
      console.group('🧮 POST-GENERATION DIAGNOSTICS: Pattern Compliance');
    
    // Group assignments by staff
    const grouped = result.assignments.reduce((acc, assignment) => {
      if (!acc[assignment.staffId]) {
        acc[assignment.staffId] = [];
      }
      acc[assignment.staffId].push(assignment);
      return acc;
    }, {} as Record<string, Array<{ staffId: string; dateISO: string; shiftType: string }>>);
    
    let totalCompliance = 0;
    let staffWithPatternsCount = 0;
    const patternAdherenceData: Array<{
      staffId: string;
      staffName?: string;
      expectedDutyDays: number;
      matchedDutyDays: number;
      adherencePct: number;
    }> = [];
    
    // OPTIMIZATION: Bulk fetch all patterns at once instead of sequential queries
    const uniquePatternIds = [...new Set(
      dedupedStaffList
        .map(s => s.pattern_id)
        .filter((id): id is string => !!id)
    )];
    
    const patternsMap = new Map<string, { sequence: string[]; name: string }>();
    
    if (uniquePatternIds.length > 0) {
      const { data: patternsData } = await supabase
        .from('site_patterns')
        .select('id, sequence, name')
        .in('id', uniquePatternIds);
      
      if (patternsData) {
        patternsData.forEach(p => {
          const sequence = Array.isArray(p.sequence)
            ? p.sequence.filter((s): s is string => typeof s === 'string')
            : [];
          patternsMap.set(p.id, { sequence, name: p.name });
        });
      }
    }
    
    console.log(`📦 Bulk loaded ${patternsMap.size} patterns for compliance check`);
    
    // Calculate compliance for each staff member
    for (const [staffId, assignments] of Object.entries(grouped)) {
      const staff = dedupedStaffList.find(s => s.id === staffId);
      const staffName = staff?.name || `${staff?.first_name} ${staff?.last_name}` || staffId;
      
      // Log assignment count per staff
      console.log(`📊 ${staffName}: ${assignments.length} assignments`);
      
      if (!staff?.pattern_id) {
        console.log(`   ⚠️ No pattern assigned - using coverage-first allocation`);
        continue;
      }
      
      // Get pattern from cached map
      const patternData = patternsMap.get(staff.pattern_id);
      
      if (!patternData) {
        console.log(`   ⚠️ Pattern not found in database`);
        continue;
      }
      
      const patternSequence = patternData.sequence;
      
      
      if (patternSequence.length === 0) {
        console.log(`   ⚠️ Empty pattern sequence`);
        continue;
      }
      
      // Compare actual vs expected
      const shifts = assignments.map(a => a.shiftType);
      const patternOffset = staff.pattern_offset ?? 0;
      
      let matches = 0;
      shifts.forEach((actualShift, index) => {
        const patternIndex = (index + patternOffset) % patternSequence.length;
        const expectedShift = patternSequence[patternIndex];
        if (actualShift === expectedShift) {
          matches++;
        }
      });
      
      const compliancePct = shifts.length > 0 ? (matches / shifts.length * 100) : 0;
      totalCompliance += compliancePct;
      staffWithPatternsCount++;
      
      // Store in diagnostics array
      patternAdherenceData.push({
        staffId,
        staffName,
        expectedDutyDays: shifts.length,
        matchedDutyDays: matches,
        adherencePct: compliancePct,
      });
      
      const icon = compliancePct >= 95 ? '✅' : compliancePct >= 80 ? '⚠️' : '❌';
      console.log(
        `   ${icon} Pattern: "${patternData.name}" | Compliance: ${compliancePct.toFixed(1)}% (${matches}/${shifts.length} matches)`
      );
    }
    
    // Log summary statistics
    const avgCompliance = staffWithPatternsCount > 0 ? (totalCompliance / staffWithPatternsCount) : 0;
    console.log("\n📈 SUMMARY:");
    console.log(`   • Total staff scheduled: ${Object.keys(grouped).length}`);
    console.log(`   • Staff with patterns: ${staffWithPatternsCount}`);
    console.log(`   • Average pattern compliance: ${avgCompliance.toFixed(1)}%`);
    console.log(`   • Total assignments generated: ${result.assignments.length}`);
    
    console.groupEnd();
    
    // Store pattern adherence in diagnostics
    result.diagnostics.patternAdherence = patternAdherenceData;
    
      logger.info('Pattern compliance diagnostics', {
        totalStaff: Object.keys(grouped).length,
        staffWithPatterns: staffWithPatternsCount,
        avgCompliance: avgCompliance.toFixed(1),
        totalAssignments: result.assignments.length
      });
    }
  } else {
    // COVERAGE-FIRST MODE: Use traditional corrective generator
    logger.info('📊 Coverage-first mode - using corrective generator');
    
    result = generateCorrectiveRoster({
      days,
      staff: correctiveStaff,
      requirements,
      policy: DEFAULT_CORRECTIVE_POLICY,
    });
  }

  logger.info('Roster generated', { 
    assignmentsCount: result.assignments.length,
    utilizationReport: result.utilizationReport
  });

  // Convert assignments to database format with strict validation
  const allowedCodes = shiftSystem === '12h' ? new Set(['D', 'N']) : new Set(['E', 'L', 'N']);
  let correctionsMade = false;
  const invalidAssignments: Array<{ staff: string; date: string; code: string }> = [];
  const assignmentsToInsert = result.assignments.map(a => {
    let finalCode: string = a.shiftType;
    
    // STRICT OUTPUT VALIDATOR: Ensure only valid shift codes for active framework
    if (!allowedCodes.has(finalCode)) {
      // Attempt final-pass correction for 12h mode
      if (shiftSystem === '12h' && (finalCode === 'E' || finalCode === 'L')) {
        logger.warn(`[VALIDATOR] Correcting invalid code "${finalCode}" → "D" (staff: ${a.staffId}, date: ${a.dateISO})`);
        finalCode = 'D';
        correctionsMade = true;
      } else {
        // Cannot correct - track as invalid
        invalidAssignments.push({ staff: a.staffId, date: a.dateISO, code: finalCode });
      }
    }
    
    return {
      version_id: versionData.id,
      tenant_id: tenantId,
      staff_id: a.staffId,
      date: a.dateISO,
      shift_code: finalCode,
      shift_start: finalCode === 'E' ? `${a.dateISO}T06:00:00` :
                   finalCode === 'L' ? `${a.dateISO}T14:00:00` :
                   finalCode === 'D' ? `${a.dateISO}T07:00:00` :
                   `${a.dateISO}T22:00:00`,
      shift_end: finalCode === 'E' ? `${a.dateISO}T14:00:00` :
                 finalCode === 'L' ? `${a.dateISO}T22:00:00` :
                 finalCode === 'D' ? `${a.dateISO}T19:00:00` :
                 addDay(`${a.dateISO}T06:00:00`),
      hours: (finalCode === 'D' || finalCode === 'N') ? 12 : 8,
      cost: 0, // Will be calculated later
    };
  });

  // Log if corrections were made
  if (correctionsMade) {
    logger.warn(`[VALIDATOR] Applied final-pass corrections to enforce ${shiftSystem} framework`);
  }

  // BLOCK if invalid codes remain after correction attempts
  if (invalidAssignments.length > 0) {
    const invalidCodes = [...new Set(invalidAssignments.map(a => a.code))].join(', ');
    const errorMsg = `Cannot save roster: ${invalidAssignments.length} assignments contain invalid shift codes (${invalidCodes}) for ${shiftSystem} mode. Expected: ${[...allowedCodes].join('/')}`;
    
    logger.error(new Error('Output validation failed'), {
      shiftSystem,
      allowedCodes: [...allowedCodes],
      invalidCount: invalidAssignments.length,
      invalidCodes: [...new Set(invalidAssignments.map(a => a.code))],
      sampleInvalid: invalidAssignments.slice(0, 3)
    });

    toast({
      title: "Generation conflict detected",
      description: errorMsg,
      variant: "destructive",
    });

    throw new Error(errorMsg);
  }

  if (assignmentsToInsert.length > 0) {
    insertStartTime = performance.now();
    const { error: insertError } = await safeInsert<any>(
      supabase
        .from('roster_assignments')
        .insert(assignmentsToInsert),
      'roster assignments'
    );

    if (insertError) {
      return Promise.reject(insertError);
    }
    
    insertEndTime = performance.now();

    // 📊 POST-GENERATION DIAGNOSTICS: Assignment Distribution (Always enabled)
    console.group('📊 POST-GENERATION DIAGNOSTICS');
    console.log(`Total assignments inserted: ${assignmentsToInsert.length}`);
      
      // Group assignments by staff
      const byStaff = assignmentsToInsert.reduce((acc, a) => {
        const staffId = a.staff_id;
        if (!acc[staffId]) {
          acc[staffId] = [];
        }
        acc[staffId].push(a);
      return acc;
    }, {} as Record<string, typeof assignmentsToInsert>);
    
    console.log('\n📊 Assignments per staff:');
    
    for (const [staffId, staffAssignments] of Object.entries(byStaff)) {
      const staffMember = correctiveStaff.find(s => s.id === staffId);
      const staffName = staffMember?.name || staffId;
      
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
        console.debug(`Could not fetch pattern for ${staffName}:`, err);
      }

      console.log(`👤 Staff: ${staffName}`);
      console.log(`   • Assignments: ${totalDays}`);
      console.log(`   • Shift breakdown:`, shiftBreakdown);
      console.log(`   • Pattern compliance: ${compliance.toFixed(1)}%`);
    }

    // Calculate overall pattern compliance
    const totalDays = days.length;
    const totalStaff = correctiveStaff.length;
    const expectedAssignments = totalDays * totalStaff;
    const complianceRate = (assignmentsToInsert.length / expectedAssignments) * 100;
    
    console.log(`\n✓ Overall coverage: ${complianceRate.toFixed(1)}%`);
    console.log(`  Expected slots: ${expectedAssignments} (${totalStaff} staff × ${totalDays} days)`);
    console.log(`  Actual assignments: ${assignmentsToInsert.length}`);
    console.log(`  Unassigned slots: ${expectedAssignments - assignmentsToInsert.length}`);

    // Utilization report from engine
    if (result.utilizationReport) {
      console.log('\n📈 Staff utilization summary:');
      const utilizationEntries = Object.entries(result.utilizationReport)
        .sort((a, b) => (b[1] as number) - (a[1] as number));
      
      utilizationEntries.forEach(([staffId, count]) => {
        const staffName = correctiveStaff.find(s => s.id === staffId)?.name || staffId;
        console.log(`  ${staffName}: ${count} shifts`);
      });
    }

    console.groupEnd();
    
    logger.info('Post-generation diagnostics complete', {
      totalAssignments: assignmentsToInsert.length,
      coverageRate: complianceRate.toFixed(1),
      expectedSlots: expectedAssignments
    });

    // ⚖️ WTD VALIDATION: Check Working Time Directive compliance
    console.group('⚖️ WTD COMPLIANCE VALIDATION');
    const wtdResults: Record<string, any> = {};
    
    for (const [staffId, staffAssignments] of Object.entries(byStaff)) {
      const staffMember = correctiveStaff.find(s => s.id === staffId);
      const staffName = staffMember?.name || staffId;
      
      // Convert assignments to ShiftRecord format
      const shiftRecords = assignmentsToShiftRecords(staffAssignments);
      
      // Run WTD validation
      const wtdValidation = validateWTDCompliance(shiftRecords);
      
      wtdResults[staffId] = {
        name: staffName,
        ...wtdValidation
      };
      
      // Log results
      const statusIcon = wtdValidation.compliant ? '✅' : '⚠️';
      console.log(`${statusIcon} ${staffName}:`);
      console.log(`   • WTD Compliant: ${wtdValidation.compliant ? 'Yes' : 'No'}`);
      console.log(`   • Avg hours/week: ${wtdValidation.avgHoursPerWeek}h (limit: 48h)`);
      console.log(`   • Rest violations: ${wtdValidation.restViolations.length}`);
      
      if (wtdValidation.restViolations.length > 0) {
        wtdValidation.restViolations.forEach((violation, i) => {
          console.warn(`     ${i + 1}. ${violation}`);
        });
      }
    }
    
    // Calculate overall compliance
    const compliantStaff = Object.values(wtdResults).filter((r: any) => r.compliant).length;
    const totalStaffChecked = Object.keys(wtdResults).length;
    const overallCompliance = (compliantStaff / totalStaffChecked) * 100;
    
    console.log(`\n📋 Overall WTD Compliance: ${overallCompliance.toFixed(1)}%`);
    console.log(`   • Compliant staff: ${compliantStaff}/${totalStaffChecked}`);
    console.groupEnd();
    
    logger.info('WTD validation complete', {
      overallCompliance: overallCompliance.toFixed(1),
      compliantStaff,
      totalStaff: totalStaffChecked
    });
  }

  logger.info('Roster generation complete', {
    versionId: versionData.id, 
    assignments: assignmentsToInsert.length,
    fairness: result.fairness,
    diagnostics: result.diagnostics
  });

  console.log('✓ Diagnostics from engine:', result.diagnostics);

  // 🔧 AUTOMATION: Apply auto-corrections and AI balancing if enabled
  let autoCorrectionsApplied = 0;
  let aiBalancingApplied = 0;
  
  const autoCorrectEnabled = automationOptions?.autoCorrect ?? true;
  const aiBalanceEnabled = automationOptions?.aiBalance ?? true;
  
  console.log('🤖 Automation settings:', { autoCorrectEnabled, aiBalanceEnabled });
  
  if (autoCorrectEnabled || aiBalanceEnabled) {
    console.group('🔧 AUTOMATION PHASE');
    
    // Fetch the inserted assignments for processing
    const { data: currentAssignments, error: fetchError } = await supabase
      .from('roster_assignments')
      .select('*')
      .eq('version_id', versionData.id)
      .order('date', { ascending: true });
    
    if (fetchError) {
      logger.warn('Failed to fetch assignments for automation', { error: fetchError });
    } else if (currentAssignments && currentAssignments.length > 0) {
      // Convert to engine format
      let engineAssignments: any[] = currentAssignments.map((a: any) => ({
        staffId: a.staff_id,
        staffName: correctiveStaff.find(s => s.id === a.staff_id)?.name || a.staff_id,
        dayIndex: 0,
        date: new Date(a.date),
        shift: a.shift_code,
        patternId: '',
        shiftStart: a.shift_start ? new Date(a.shift_start) : undefined,
        shiftEnd: a.shift_end ? new Date(a.shift_end) : undefined,
        hours: a.hours,
        cost: a.cost,
      }));
      
      // Apply auto-corrections if enabled
      const patternMode = (configData.pattern_adherence_mode as 'locked' | 'guided') || 'locked';
      
      console.log(`🔒 Pattern adherence mode: ${patternMode}`);
      logger.info('Pattern adherence mode', { mode: patternMode });
      
      if (autoCorrectEnabled) {
        console.log('🔧 Applying automatic corrections...');
        
        // Build basic diagnostics for correction engine
        const basicDiagnostics = {
          restViolations: {},
          weeklyAverageCompliant: {},
          avgHoursPerWeek: {},
          staffSummary: [],
          overallCompliance: { avgCompliance: 100, totalShifts: 0, fullyCompliant: 0 },
          patternMode
        };
        
        const correctionResult = await autoApplyCorrections(
          engineAssignments, 
          basicDiagnostics,
          versionData.id,
          undefined, // tenantId - to be added when tenant isolation is complete
          patternMode === 'locked' // restOnlyMode flag
        );
        engineAssignments = correctionResult.roster;
        autoCorrectionsApplied = correctionResult.changelog.length;
        
        console.log(`✅ Applied ${autoCorrectionsApplied} automatic corrections (mode: ${patternMode})`);
        logger.info('Auto-corrections applied', { 
          count: autoCorrectionsApplied,
          mode: patternMode 
        });
      }
      
      // Apply AI fairness balancing only in guided mode
      if (aiBalanceEnabled && patternMode === 'guided') {
        console.log('⚖️ Applying AI fairness balancing (guided mode)...');
        
        // Load historical roster data (last 3 months)
        const threeMonthsAgo = new Date(days[0] + 'T00:00:00');
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const { data: historicalAssignments } = await supabase
          .from('roster_assignments')
          .select('staff_id, date, shift_code')
          .gte('date', threeMonthsAgo.toISOString().split('T')[0])
          .lt('date', days[0]);
        
        const historicalRoster = (historicalAssignments || []).map((a: any) => ({
          staffId: a.staff_id,
          staffName: correctiveStaff.find(s => s.id === a.staff_id)?.name || a.staff_id,
          dayIndex: 0,
          date: new Date(a.date),
          shift: a.shift_code,
          patternId: 'historical'
        }));
        
        const beforeBalancing = engineAssignments.length;
        engineAssignments = balanceRoster(engineAssignments, historicalRoster);
        aiBalancingApplied = engineAssignments.filter(a => a.notes && a.notes.includes('Fatigue prevention')).length;
        
        console.log(`✅ Applied ${aiBalancingApplied} AI balancing adjustments (${historicalRoster.length} historical records analyzed)`);
        logger.info('AI balancing applied', { 
          count: aiBalancingApplied,
          historicalRecords: historicalRoster.length 
        });
      } else if (patternMode === 'locked') {
        console.log('🔒 Skipping AI fairness balancing (locked mode - strict pattern adherence)');
        logger.info('AI balancing skipped', { reason: 'locked mode' });
      }
      
      // Update database with corrected assignments if any changes were made
      if (autoCorrectionsApplied > 0 || aiBalancingApplied > 0) {
        console.log('💾 Updating database with automated changes...');
        
        // Delete old assignments
        await supabase
          .from('roster_assignments')
          .delete()
          .eq('version_id', versionData.id);
        
        // Insert updated assignments with batch optimization
        const updatedAssignments = engineAssignments.map(a => ({
          version_id: versionData.id,
          tenant_id: tenantId,
          staff_id: a.staffId,
          date: a.date.toISOString().split('T')[0],
          shift_code: a.shift,
          shift_start: a.shiftStart?.toISOString(),
          shift_end: a.shiftEnd?.toISOString(),
          hours: a.hours || (a.shift === 'D' || a.shift === 'N' ? 12 : 8),
          cost: a.cost || 0,
        }));
        
        // OPTIMIZATION: Batch insert in chunks of 500 to handle large rosters
        const batchSize = 500;
        for (let i = 0; i < updatedAssignments.length; i += batchSize) {
          const chunk = updatedAssignments.slice(i, i + batchSize);
          await supabase
            .from('roster_assignments')
            .insert(chunk);
          
          console.log(`📦 Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(updatedAssignments.length / batchSize)} (${chunk.length} records)`);
        }
        
        console.log('✅ Database updated with automated changes');
        logger.info('Assignments updated', { count: updatedAssignments.length });
      }
    }
    
    console.groupEnd();
  }

  // Calculate total variance as sum of E, L, N variances
  const totalVariance = result.fairness.variance.E + result.fairness.variance.L + result.fairness.variance.N;

  const totalMs = Math.round(performance.now() - perfStart);
  const insertMs = Math.round(insertEndTime - insertStartTime);
  const genMs = Math.round(genEndTime - genStartTime);
  const fetchMs = Math.round(totalMs - genMs - insertMs);
  
  console.log(`⚡ Performance: Fetch ${fetchMs}ms | Generate ${genMs}ms | Insert ${insertMs}ms | Total ${totalMs}ms`);

  return {
    versionId: versionData.id,
    totalAssignments: assignmentsToInsert.length,
    optimizationResult: { score: Math.max(0, 100 - totalVariance) },
    wtrResult: { violations: result.violations },
    costResult: { totalCost: 0, averageCost: 0, breakdown: {} },
    generatorResult: result, // Pass through full engine result with diagnostics
    patternLocked: config.patternLocked ?? false, // Pass through pattern-locked mode flag
    autoCorrectionsApplied,
    aiBalancingApplied,
    perfMetrics: {
      fetchMs,
      genMs,
      insertMs,
      totalMs
    }
  };
}

// Helper to add one day to ISO timestamp
function addDay(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  d.setDate(d.getDate() + 1);
  return d.toISOString().replace('Z', '').replace('.000', '');
}
