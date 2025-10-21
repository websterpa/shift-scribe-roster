import { supabase } from "@/integrations/supabase/client";
import type { StaffMember } from "@/types/roster";
import { generateCorrectiveRoster, type CorrectiveStaffMember, type CoverageRequirements, type CorrectiveResult, DEFAULT_CORRECTIVE_POLICY } from "@/features/roster/engine";
import { createLogger } from "../errorLogger";

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
  const { data: existingVersions } = await supabase
    .from('roster_versions')
    .select('version_number')
    .eq('config_id', configId)
    .order('version_number', { ascending: false })
    .limit(1);
  
  const nextVersionNumber = (existingVersions && existingVersions[0]) 
    ? existingVersions[0].version_number + 1 
    : 1;

  const { data: versionData, error: versionError } = await supabase
    .from('roster_versions')
    .insert({
      config_id: configId,
      version_name: versionNameToUse || `Version ${Date.now()}`,
      version_number: nextVersionNumber,
    })
    .select()
    .single();

  if (versionError || !versionData) {
    logger.error(new Error('Failed to create roster version'), { error: versionError });
    throw new Error(`Failed to create roster version: ${versionError?.message || 'Unknown error'}`);
  }

  logger.info('Created roster version', { versionId: versionData.id });

  // Fetch roster config to get coverage requirements
  const { data: configData, error: configError } = await supabase
    .from('roster_config')
    .select('*')
    .eq('id', configId)
    .single();

  if (configError || !configData) {
    logger.error(new Error('Failed to fetch roster config'), { error: configError });
    throw new Error(`Failed to fetch roster config: ${configError?.message || 'Unknown error'}`);
  }

  // Build days array for the month
  const [year, month] = monthISO.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(`${monthISO}-${String(day).padStart(2, '0')}`);
  }

  // Convert deduplicated staff list to CorrectiveStaffMember format
  const correctiveStaff: CorrectiveStaffMember[] = dedupedStaffList.map(s => ({
    id: s.id,
    name: s.name || `${s.first_name} ${s.last_name}`,
    availability: {}, // All days available by default
    isNightEligible: s.eligible_shifts?.includes('Night') ?? true,
  }));

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
    const errorMsg = `Cannot generate roster: only ${correctiveStaff.length}/${EXPECTED_MIN_STAFF} eligible staff found. Go to Settings → Staff and ensure more team members are marked as active.`;
    console.error("[BLOCK] Eligible staff below expected", {
      found: correctiveStaff.length,
      expected: EXPECTED_MIN_STAFF,
      names: correctiveStaff.map(s => s.name),
    });
    logger.error(new Error('Insufficient staff pool'), {
      found: correctiveStaff.length,
      expected: EXPECTED_MIN_STAFF,
    });
    throw new Error(errorMsg);
  }

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

  // VALIDATION: Ensure requirements only use valid shift type keys
  const validShiftTypes = new Set(['E', 'L', 'N']);
  days.forEach((dateISO, dayIndex) => {
    const dayReqs = requirements[dateISO];
    const keys = Object.keys(dayReqs);
    
    for (const key of keys) {
      const normalized = key.trim().toUpperCase();
      
      // Check if normalized key is valid
      if (!validShiftTypes.has(normalized)) {
        throw new Error(
          `Invalid requirement key "${key}" on day ${dayIndex + 1} (${dateISO}). ` +
          `Only E/L/N are allowed.`
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

  // Convert assignments to database format and insert
  const assignmentsToInsert = result.assignments.map(a => ({
    version_id: versionData.id,
    staff_id: a.staffId,
    date: a.dateISO,
    shift_code: a.shiftType,
    shift_start: a.shiftType === 'E' ? `${a.dateISO}T06:00:00` :
                 a.shiftType === 'L' ? `${a.dateISO}T14:00:00` :
                 `${a.dateISO}T22:00:00`,
    shift_end: a.shiftType === 'E' ? `${a.dateISO}T14:00:00` :
               a.shiftType === 'L' ? `${a.dateISO}T22:00:00` :
               addDay(`${a.dateISO}T06:00:00`),
    hours: 8,
    cost: 0, // Will be calculated later
  }));

  if (assignmentsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('roster_assignments')
      .insert(assignmentsToInsert);

    if (insertError) {
      logger.error(new Error('Failed to insert assignments'), { error: insertError });
      throw new Error(`Failed to insert assignments: ${insertError.message}`);
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
