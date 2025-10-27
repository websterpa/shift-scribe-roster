import { supabase } from "@/integrations/supabase/client";
import type { StaffMember } from "@/types/roster";
import { generateCorrectiveRoster, type CorrectiveStaffMember, type CoverageRequirements, type CorrectiveResult, DEFAULT_CORRECTIVE_POLICY } from "@/features/roster/engine";
import { remapToFramework } from "@/features/roster/shiftMap";
import { toast } from "@/hooks/use-toast";
import { createLogger } from "../errorLogger";
import { safeSelect, safeInsert } from "@/integrations/supabase/safeQuery";

const logger = createLogger('GenerateAndSaveRoster');

/**
 * Backward-compatible wrapper for generateRoster
 * Used by wizard and legacy components
 */
export async function generateAndSaveRoster(
  staffList: StaffMember[],
  config: any, // Accept any config format for backward compatibility
  versionName?: string
): Promise<{
  versionId: string;
  totalAssignments: number;
  optimizationResult?: { score: number };
  wtrResult?: { violations: unknown[] };
  costResult?: { totalCost: number; averageCost: number; breakdown: Record<string, unknown> };
  generatorResult?: CorrectiveResult;
}> {
  // Extract config properties - handle both new and legacy formats
  const configId = config.configId || config.id;
  const monthISO = config.monthISO || config.start_date?.substring(0, 7);
  const versionNameToUse = versionName || config.versionName || config.config_name;
  const shiftSystem = config.shift_type || '8h'; // Driven by wizard UI selection
  
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
    sampleRequirements: requirements[days[0]]
  });

  // Generate roster using corrective engine
  const result = generateCorrectiveRoster({
    days,
    staff: correctiveStaff,
    requirements,
    policy: DEFAULT_CORRECTIVE_POLICY,
  });

  logger.info('Corrective roster generated', { 
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
    const { error: insertError } = await safeInsert<any>(
      supabase
        .from('roster_assignments')
        .insert(assignmentsToInsert),
      'roster assignments'
    );

    if (insertError) {
      return Promise.reject(insertError);
    }
  }

  logger.info('Roster generation complete', { 
    versionId: versionData.id, 
    assignments: assignmentsToInsert.length,
    fairness: result.fairness
  });

  // Calculate total variance as sum of E, L, N variances
  const totalVariance = result.fairness.variance.E + result.fairness.variance.L + result.fairness.variance.N;

  return {
    versionId: versionData.id,
    totalAssignments: assignmentsToInsert.length,
    optimizationResult: { score: Math.max(0, 100 - totalVariance) },
    wtrResult: { violations: result.violations },
    costResult: { totalCost: 0, averageCost: 0, breakdown: {} },
    generatorResult: result,
  };
}

// Helper to add one day to ISO timestamp
function addDay(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  d.setDate(d.getDate() + 1);
  return d.toISOString().replace('Z', '').replace('.000', '');
}
