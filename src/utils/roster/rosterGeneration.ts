import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { expandShift } from "../../engine2/time/expandShift";
import { costShift } from "../../engine2/cost/costShift";
import { validateRest } from "../../engine2/rules/validateRest";
import type {
  RatePolicy,
  RestRules,
  Holiday,
  ShiftSpec,
  Assignment,
} from "../../engine2/types";
import { fetchStaffMembers } from "./staffHelpers";
import type { StaffMember } from "@/types/roster";

/**
 * Expected requirements JSON shape stored in roster_config.staffing_requirements:
 * {
 *   "days": {
 *     "2025-09-01": [
 *       { "role_id":"REG", "site_id":"SITE1", "start":"2025-09-01T08:00:00", "end":"2025-09-01T16:00:00", "needed": 2 },
 *       ...
 *     ],
 *     ...
 *   }
 * }
 * Adapt the loader if your shape differs.
 */

type Requirement = {
  role_id: string;
  site_id: string;
  start: string; // ISO
  end: string;   // ISO
  needed: number;
};
type RequirementsByDate = Record<string, Requirement[]>;

type GenerateParams = {
  supabase: SupabaseClient;
  rosterVersionId: string;
  monthISO: string; // "YYYY-MM"
  ratePolicy: RatePolicy;
  restRules: RestRules;
  holidays?: Holiday[];
  staffIds?: string[]; // optional explicit pool; otherwise load from "staff" or synth fallback
};

type GenerateSummary = {
  versionId: string;
  monthISO: string;
  requirementsLoaded: number;
  assignmentsPlanned: number;
  assignmentsInserted: number;
  rejected: Array<{ reason: string; requirement: Requirement }>;
};

/**
 * Minimal, deterministic roster generator that:
 * 
 * o Loads requirements for a version/month
 * 
 * o Allocates staff via round-robin respecting rest rules
 * 
 * o Calculates cost via engine2
 * 
 * o Inserts rows into public.roster_assignments (batched)
 */
export async function generateRoster(params: GenerateParams): Promise<GenerateSummary> {
  const {
    supabase,
    rosterVersionId,
    monthISO,
    ratePolicy,
    restRules,
    holidays = [],
    staffIds,
  } = params;

  // 1) Load requirements - TODO: adjust if your schema differs
  const { data: versionData, error: versionErr } = await supabase
    .from("roster_versions")
    .select("config_id")
    .eq("id", rosterVersionId)
    .single();

  if (versionErr) throw new Error(`Failed to load roster version ${rosterVersionId}: ${versionErr.message}`);

  const { data: cfg, error: cfgErr } = await supabase
    .from("roster_config")
    .select("staffing_requirements")
    .eq("id", versionData.config_id)
    .single();

  if (cfgErr) throw new Error(`Failed to load roster_config for version ${rosterVersionId}: ${cfgErr.message}`);

  const reqJson = (cfg?.staffing_requirements ?? null) as { days?: RequirementsByDate } | null;
  if (!reqJson || !reqJson.days) {
    throw new Error(`No staffing_requirements JSON found for version ${rosterVersionId}`);
  }

  // Flatten & filter by month
  const requirements: Requirement[] = [];
  for (const [dateISO, list] of Object.entries(reqJson.days)) {
    if (!dateISO.startsWith(monthISO)) continue;
    for (const r of list) {
      requirements.push({
        role_id: r.role_id,
        site_id: r.site_id,
        start: r.start,
        end: r.end,
        needed: Math.max(1, Number(r.needed ?? 1)),
      });
    }
  }
  if (requirements.length === 0) {
    throw new Error(`No staffing requirements for month ${monthISO} (version ${rosterVersionId})`);
  }

  // 2) Resolve staff pool
  let pool: string[] = [];
  if (staffIds && staffIds.length) {
    pool = [...staffIds];
  } else {
    // Try to load active staff from staff_profiles table
    const { data: staffTbl, error: staffErr } = await supabase
      .from("staff_profiles")
      .select("id, is_active")
      .eq("is_active", true);
    if (!staffErr && Array.isArray(staffTbl) && staffTbl.length > 0) {
      pool = staffTbl.map(r => String(r.id));
    }
  }
  if (pool.length === 0) {
    // Dev fallback so builders still insert rows without a staff table.
    pool = ["SYNTH_1", "SYNTH_2", "SYNTH_3"];
  }

  // 3) Allocate: round-robin with rest validation
  const planned: Assignment[] = [];
  const perStaff: Record<string, Assignment[]> = {};
  const rejected: Array<{ reason: string; requirement: Requirement }> = [];
  let rr = 0;

  for (const req of requirements) {
    const start = new Date(req.start);
    const end = new Date(req.end);
    for (let n = 0; n < req.needed; n++) {
      let placed = false;
      const attempts = pool.length || 1;

      for (let t = 0; t < attempts; t++) {
        const staffId = pool[rr % pool.length];
        rr++;

        const candidate: Assignment = {
          staffId,
          shift: { start, end, roleId: req.role_id, siteId: req.site_id },
        };

        const current = perStaff[staffId] ?? [];
        const violations = validateRest([...current, candidate], restRules);
        const hasHardBlock = violations.some(v =>
          v.code === "OVERLAP" || v.code === "REST_DAILY" || v.code === "MAX_WEEKLY" || v.code === "REST_WEEKLY"
        );

        if (hasHardBlock) {
          continue; // try next staff
        }

        // Accept
        perStaff[staffId] = [...current, candidate];
        planned.push(candidate);
        placed = true;
        break;
      }

      if (!placed) {
        rejected.push({ reason: "No eligible staff (rest/overlap constraints)", requirement: req });
      }
    }
  }

  if (planned.length === 0) {
    throw new Error(`Planner produced zero assignments for ${monthISO}. Check rest rules, staff pool, and requirements.`);
  }

  // 4) Price and map to DB rows
  const rows = planned.map(a => {
    const spec: ShiftSpec = {
      start: a.shift.start,
      end: a.shift.end,
      roleId: a.shift.roleId,
      siteId: a.shift.siteId,
      // flatShiftPay can be provided per-shift if your UI supports it
    };
    const segments = expandShift(spec, { holidays });
    const cost = costShift(spec, segments, ratePolicy);
    
    return {
      // --- identifiers / FKs (adjust names if needed) ---
      version_id: rosterVersionId,
      staff_id: a.staffId,
      date: a.shift.start.toISOString().split('T')[0], // YYYY-MM-DD
      shift_code: getShiftCodeFromTimes(a.shift.start, a.shift.end), // Map times to D/E/L/N
      shift_start: a.shift.start.toISOString(),
      shift_end: a.shift.end.toISOString(),
      
      // --- costs ---
      cost: cost.total,
      hours: Math.round((a.shift.end.getTime() - a.shift.start.getTime()) / (1000 * 60 * 60)),
      
      // Store detailed cost breakdown in a JSON field if available
      created_at: new Date().toISOString(),
    };
  });

  // 5) Insert in batches with explicit RLS error handling
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error: insErr, data, count } = await supabase
      .from("roster_assignments")
      .insert(chunk)
      .select("*");

    if (insErr) {
      if (/RLS|policy/i.test(insErr.message)) {
        throw new Error(
          `Insert blocked by RLS on public.roster_assignments for version ${rosterVersionId}. ` +
          `Ensure the current role/key has INSERT and a row policy permits this roster_version_id. Details: ${insErr.message}`
        );
      }
      throw new Error(`Failed to insert roster assignments: ${insErr.message}`);
    }
    inserted += count ?? chunk.length;
  }

  return {
    versionId: rosterVersionId,
    monthISO,
    requirementsLoaded: requirements.length,
    assignmentsPlanned: planned.length,
    assignmentsInserted: inserted,
    rejected,
  };
}

/**
 * Helper to map shift times to shift codes based on start hour
 * TODO: Make this configurable based on site settings
 */
function getShiftCodeFromTimes(start: Date, end: Date): string {
  const hour = start.getHours();
  
  // Simple mapping based on start times - adjust as needed
  if (hour >= 6 && hour < 14) return 'D'; // Day shift
  if (hour >= 14 && hour < 22) return 'L'; // Late shift  
  if (hour >= 22 || hour < 6) return 'N'; // Night shift
  
  // Fallback for Early shifts in 8h systems
  if (hour >= 6 && hour < 10) return 'E'; // Early shift
  
  return 'D'; // Default fallback
}

/**
 * Default policies for testing - TODO: load from site settings
 */
export function getDefaultRatePolicy(): RatePolicy {
  return {
    baseHourly: 15,
    differentials: [
      { tag: "NIGHT", percentage: 0.30 },
      { tag: "WEEKEND", percentage: 0.25 },
    ],
    premiumMultipliers: [
      { tag: "PUBLIC_HOLIDAY", multiplier: 2.0 },
    ],
    stacking: { kind: "MAX_OF", components: ["DIFF", "MULTIPLIER"], includeFlat: true },
    allowances: [
      { code: "MEAL", amount: 5 },
    ],
  };
}

export function getDefaultRestRules(): RestRules {
  return {
    minDailyRestHours: 11,
    minWeeklyRestHours: 24,
    maxWeeklyHours: 60,
  };
}

/**
 * Legacy export for compatibility - alias for staffHelpers 
 */
export { fetchStaffMembers };

/**
 * Simple roster assignments generator for compatibility
 */
export async function generateRosterAssignments(
  configId: string,
  staffMembers: StaffMember[],
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  // TODO: Implement or delegate to main generateRoster function
  console.log('generateRosterAssignments called - placeholder implementation');
  return [];
}

/**
 * Legacy function wrapper for compatibility - generates with defaults
 */
export async function generateAndSaveRoster(
  staffList: any[],
  config: any,
  versionName?: string
) {
  console.log('🚀 Starting deterministic roster generation with engine2...');
  
  try {
    // Create a roster version first
    const { data: versionData, error: versionErr } = await supabase
      .from("roster_versions")
      .insert({
        config_id: config.id,
        version_name: versionName || `Generated ${new Date().toLocaleDateString()}`,
        version_number: 1,
      })
      .select("id")
      .single();
      
    if (versionErr) throw new Error(`Failed to create roster version: ${versionErr.message}`);
    
    const versionId = versionData.id;
    
    // Extract month from start date  
    const monthISO = config.start_date.substring(0, 7); // "YYYY-MM"
    
    // Use default policies for now - TODO: load from site settings
    const ratePolicy = getDefaultRatePolicy();
    const restRules = getDefaultRestRules();
    
    // Extract staff IDs
    const staffIds = staffList.map(s => s.id);
    
    const result = await generateRoster({
      supabase,
      rosterVersionId: versionId,
      monthISO,
      ratePolicy,
      restRules,
      holidays: [], // TODO: load from holiday calendar
      staffIds,
    });
    
    console.log('✅ Roster generation completed:', result);
    
    return {
      versionId: result.versionId,
      totalAssignments: result.assignmentsInserted,
      optimizationResult: { score: 100 }, // Placeholder
      wtrResult: { violations: [] }, // Placeholder
      costResult: { totalCost: 0 }, // TODO: calculate from assignments
    };
    
  } catch (error: any) {
    console.error('❌ Roster generation failed:', error);
    throw new Error(`Roster generation failed: ${error.message}`);
  }
}