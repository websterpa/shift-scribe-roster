import { supabase } from "@/integrations/supabase/client";
import type { StaffMember } from "@/types/roster";
import { generateCorrectiveRoster, type CorrectiveStaffMember, type CoverageRequirements, DEFAULT_CORRECTIVE_POLICY } from "@/engine2/generators/correctiveRosterGenerator";
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
}> {
  // Extract config properties - handle both new and legacy formats
  const configId = config.configId || config.id;
  const monthISO = config.monthISO || config.start_date?.substring(0, 7);
  const versionNameToUse = versionName || config.versionName || config.config_name;
  
  logger.info('generateAndSaveRoster called', { configId, monthISO });
  
  if (!configId || !monthISO) {
    throw new Error("configId and monthISO are required");
  }

  // Extract staff IDs
  const staffIds = staffList.map(s => s.id);

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

  // Convert staffList to CorrectiveStaffMember format
  const correctiveStaff: CorrectiveStaffMember[] = staffList.map(s => ({
    id: s.id,
    name: s.name || `${s.first_name} ${s.last_name}`,
    availability: {}, // All days available by default
    isNightEligible: s.eligible_shifts?.includes('Night') ?? true,
  }));

  // Set all days as available for all staff
  correctiveStaff.forEach(s => {
    days.forEach(d => {
      s.availability[d] = true;
    });
  });

  // Parse coverage requirements from config
  const requirements: CoverageRequirements = {};
  const staffingReqs = configData.staffing_requirements || {};
  
  days.forEach(dateISO => {
    const jsDay = new Date(dateISO + 'T00:00:00').getDay();
    const dayOfWeek = String(jsDay); // 0=Sunday, 6=Saturday
    const dayReqs = staffingReqs[dayOfWeek] || {};
    
    requirements[dateISO] = {
      E: dayReqs.E || dayReqs.D || 2, // Default 2 early shifts
      L: dayReqs.L || 1, // Default 1 late shift
      N: dayReqs.N || 1, // Default 1 night shift
    };
  });

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
  };
}

// Helper to add one day to ISO timestamp
function addDay(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  d.setDate(d.getDate() + 1);
  return d.toISOString().replace('Z', '').replace('.000', '');
}
