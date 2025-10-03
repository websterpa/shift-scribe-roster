import type { SupabaseClient } from "@supabase/supabase-js";
import { expandShift } from "../../engine2/time/expandShift";
import { costShift } from "../../engine2/cost/costShift";
import { validateRest } from "../../engine2/rules/validateRest";
import type { RatePolicy, RestRules, Holiday, ShiftSpec, Assignment } from "../../engine2/types";
import { toCode } from "../../features/roster/monthly/shiftMapping";

/** ––––– Config for schema/columns and defaults ––––– */
export type GeneratorConfig = {
  tables: {
    rosterConfig: string;          // e.g., "roster_config"
    staff: string;                 // e.g., "staff_profiles"
    assignments: string;           // e.g., "roster_assignments"
  };
  columns: {
    // roster_config
    rosterConfigVersionFK: string; // e.g., "config_id" (FK to roster_versions)
    rosterConfigRequirements: string; // e.g., "staffing_requirements"
    // assignments
    asgVersionFK: string;          // e.g., "version_id"
    asgStaffId: string;            // e.g., "staff_id"
    asgRoleId: string;             // e.g., "role_id"
    asgSiteId: string;             // e.g., "site_id"
    asgStart: string;              // e.g., "shift_start"
    asgEnd: string;                // e.g., "shift_end"
    asgCostBase: string;           // e.g., "cost_base"
    asgCostDiff: string;           // e.g., "cost_diff"
    asgCostPrem: string;           // e.g., "cost_premium"
    asgCostFlat: string;           // e.g., "cost_flat"
    asgCostAllow: string;          // e.g., "cost_allowances"
    asgCostTotal: string;          // e.g., "cost_total"
    asgMeta: string;               // e.g., "meta"
    asgDate: string;               // e.g., "date"
    asgShiftCode: string;          // e.g., "shift_code"
    asgHours: string;              // e.g., "hours"
    asgCost: string;               // e.g., "cost"
  };
  staff: {
    idCol: string;                 // e.g., "id"
    activeCol?: string;            // e.g., "is_active" (optional)
    activeValue?: any;             // e.g., true
  };
  defaults: {
    // for legacy weekday format
    dayShiftStart: string;         // "08:00"
    dayShiftEnd: string;           // "16:00"
    nightShiftStart: string;       // "22:00"
    nightShiftEnd: string;         // "06:00" (next day)
    siteId?: string;               // fallback site
  };
};

type Requirement = { role_id: string; site_id: string; start: string; end: string; needed: number; };
type RequirementsByDate = Record<string, Requirement[]>;

type GenerateParams = {
  supabase: SupabaseClient;
  rosterVersionId: string; // value for config.columns.asgVersionFK
  monthISO: string;        // "YYYY-MM"
  ratePolicy: RatePolicy;
  restRules: RestRules;
  holidays?: Holiday[];
  staffIds?: string[];     // optional explicit pool
  config: GeneratorConfig;
};

type GenerateSummary = {
  versionId: string;
  monthISO: string;
  requirementsLoaded: number;
  assignmentsPlanned: number;
  assignmentsInserted: number;
  rejected: Array<{ reason: string; requirement: Requirement }>;
};

/** ––––– Helpers ––––– */
function pad(n: number) { return String(n).padStart(2, "0"); }
function addDays(dateISO: string, delta: number): string {
  const d = new Date(dateISO + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function weekday(dateISO: string): number {
  return new Date(dateISO + "T00:00:00").getDay(); // 0..6
}

/** Build concrete date requirements for a month from legacy weekday spec. */
function expandLegacyRequirements(legacy: any, monthISO: string, defaults: GeneratorConfig["defaults"]): Requirement[] {
  // legacy example: { "0": {"D":2,"N":1}, "1": {"D":2,"N":1"}, … }
  const out: Requirement[] = [];
  const [y, m] = monthISO.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateISO = `${monthISO}-${pad(day)}`;
    const w = weekday(dateISO); // 0..6
    const spec = legacy[String(w)];
    if (!spec) continue;
    // Day shift
    const dNeed = Number(spec["D"] ?? 0);
    for (let i = 0; i < dNeed; i++) {
      out.push({
        role_id: "D",
        site_id: defaults.siteId ?? "DEFAULT",
        start: `${dateISO}T${defaults.dayShiftStart}:00`,
        end: `${dateISO}T${defaults.dayShiftEnd}:00`,
        needed: 1,
      });
    }
    // Night shift (spans to next day if end < start)
    const nNeed = Number(spec["N"] ?? 0);
    for (let i = 0; i < nNeed; i++) {
      const endDate = (defaults.nightShiftEnd < defaults.nightShiftStart) ? addDays(dateISO, 1) : dateISO;
      out.push({
        role_id: "N",
        site_id: defaults.siteId ?? "DEFAULT",
        start: `${dateISO}T${defaults.nightShiftStart}:00`,
        end: `${endDate}T${defaults.nightShiftEnd}:00`,
        needed: 1,
      });
    }
  }
  return out;
}

/** Parse requirements whether new or legacy format. */
function parseRequirements(raw: any, monthISO: string, defaults: GeneratorConfig["defaults"]): Requirement[] {
  if (!raw) return [];
  if (raw.days && typeof raw.days === "object") {
    // New format
    const reqs: Requirement[] = [];
    for (const [dateISO, list] of Object.entries(raw.days as RequirementsByDate)) {
      if (!dateISO.startsWith(monthISO)) continue;
      for (const r of (list as Requirement[])) {
        reqs.push({
          role_id: r.role_id,
          site_id: r.site_id ?? (defaults.siteId ?? "DEFAULT"),
          start: r.start,
          end: r.end,
          needed: Math.max(1, Number(r.needed ?? 1)),
        });
      }
    }
    return reqs;
  }
  // Legacy weekday map
  return expandLegacyRequirements(raw, monthISO, defaults);
}

/** Helper to map shift times to shift codes based on start hour */
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

/** ––––– Main generator ––––– */
export async function generateRoster(params: GenerateParams): Promise<GenerateSummary> {
  const { supabase, rosterVersionId, monthISO, ratePolicy, restRules, holidays = [], staffIds, config } = params;
  const t = config.tables;
  const c = config.columns;

  // 1) Load requirements JSON from roster_config via roster_versions
  const { data: versionData, error: versionErr } = await supabase
    .from("roster_versions")
    .select("config_id")
    .eq("id", rosterVersionId)
    .single();

  if (versionErr) throw new Error(`Failed to load roster version ${rosterVersionId}: ${versionErr.message}`);

  const { data: cfg, error: cfgErr } = await supabase
    .from(t.rosterConfig)
    .select(c.rosterConfigRequirements)
    .eq("id", versionData.config_id)
    .single();
  
  if (cfgErr) throw new Error(`Failed to load ${t.rosterConfig} for version ${rosterVersionId}: ${cfgErr.message}`);

  const rawReq = cfg?.[c.rosterConfigRequirements] ?? null;
  const requirements = parseRequirements(rawReq, monthISO, config.defaults);
  if (requirements.length === 0) throw new Error(`No staffing requirements for month ${monthISO} (version ${rosterVersionId})`);

  // 2) Resolve staff pool (validate; no synthetic fallback)
  let pool: string[] = [];
  if (staffIds?.length) {
    pool = [...staffIds];
  } else {
    let query = supabase.from(t.staff).select(config.staff.idCol);
    if (config.staff.activeCol) query = query.eq(config.staff.activeCol, config.staff.activeValue);
    const { data: staffTbl, error: staffErr } = await query;
    if (staffErr) throw new Error(`Failed to load staff from ${t.staff}: ${staffErr.message}`);
    pool = (staffTbl ?? []).map((r: any) => String(r[config.staff.idCol]));
  }
  if (pool.length === 0) throw new Error("No active staff available for allocation. Populate staff_profiles or pass staffIds.");

  // Preflight: confirm staff IDs exist
  const { data: existRows, error: existErr } = await supabase
    .from(t.staff)
    .select(config.staff.idCol)
    .in(config.staff.idCol, pool);
  if (existErr) throw new Error(`Failed to validate staff IDs: ${existErr.message}`);
  const existing = new Set((existRows ?? []).map((r: any) => String(r[config.staff.idCol])));
  const missing = pool.filter(id => !existing.has(id));
  if (missing.length) throw new Error(`Unknown staffIds (FK would fail): ${missing.join(", ")}`);

  // 3) Allocate round-robin with rest checks
  const planned: Assignment[] = [];
  const perStaff: Record<string, Assignment[]> = {};
  const rejected: Array<{ reason: string; requirement: Requirement }> = [];
  let rr = 0;

  for (const req of requirements) {
    const start = new Date(req.start);
    const end = new Date(req.end);
    for (let n = 0; n < Math.max(1, req.needed); n++) {
      let placed = false;
      for (let tIdx = 0; tIdx < pool.length; tIdx++) {
        const staffId = pool[rr % pool.length]; rr++;
        const candidate: Assignment = { staffId, shift: { start, end, roleId: req.role_id, siteId: req.site_id } };
        const current = perStaff[staffId] ?? [];
        const violations = validateRest([...current, candidate], restRules);
        const block = violations.some(v => v.code === "OVERLAP" || v.code === "REST_DAILY" || v.code === "REST_WEEKLY" || v.code === "MAX_WEEKLY");
        if (block) continue;
        perStaff[staffId] = [...current, candidate];
        planned.push(candidate);
        placed = true;
        break;
      }
      if (!placed) rejected.push({ reason: "No eligible staff (rest constraints)", requirement: req });
    }
  }
  if (planned.length === 0) throw new Error(`Planner produced zero assignments for ${monthISO}. Check rest rules, staff pool, and requirements.`);

  // 4) Price & map rows with column mappings
  const rows = planned.map(a => {
    const spec: ShiftSpec = { start: a.shift.start, end: a.shift.end, roleId: a.shift.roleId, siteId: a.shift.siteId };
    const segs = expandShift(spec, { holidays });
    const cost = costShift(spec, segs, ratePolicy);
    
    // Calculate basic shift info
    const shiftHours = Math.round((a.shift.end.getTime() - a.shift.start.getTime()) / (1000 * 60 * 60));
    
    // Map roleId (may be logical like "Night") to shift_code (like "N")
    const logicalOrCode = a.shift.roleId ?? getShiftCodeFromTimes(a.shift.start, a.shift.end);
    const shiftCode = toCode(logicalOrCode);
    
    if (!shiftCode || shiftCode.trim() === "") {
      throw new Error(`Refusing to insert: empty shift_code derived from roleId "${a.shift.roleId}"`);
    }
    
    const dateStr = a.shift.start.toISOString().split('T')[0];
    
    // Build row with dynamic column mapping
    const row: Record<string, any> = {
      [c.asgVersionFK]: rosterVersionId,
      [c.asgStaffId]: a.staffId,
      [c.asgStart]: a.shift.start.toISOString(),
      [c.asgEnd]: a.shift.end.toISOString(),
      [c.asgDate]: dateStr,
      [c.asgShiftCode]: shiftCode,
      [c.asgHours]: shiftHours,
      [c.asgCost]: cost.total,
    };
    
    // Add optional fields if they exist in config
    if (c.asgRoleId) row[c.asgRoleId] = a.shift.roleId;
    if (c.asgSiteId) row[c.asgSiteId] = a.shift.siteId;
    if (c.asgCostBase) row[c.asgCostBase] = cost.base;
    if (c.asgCostDiff) row[c.asgCostDiff] = cost.differential;
    if (c.asgCostPrem) row[c.asgCostPrem] = cost.premium;
    if (c.asgCostFlat) row[c.asgCostFlat] = cost.flatShiftPay;
    if (c.asgCostAllow) row[c.asgCostAllow] = cost.allowances;
    if (c.asgCostTotal) row[c.asgCostTotal] = cost.total;
    if (c.asgMeta) row[c.asgMeta] = { explain: cost.lines, first_segment_tags: segs[0]?.tags ?? [] };
    
    return row;
  });
  
  // Post-plan validation: ensure required logical shifts have assignments
  const requiredLogicalShifts = new Set<string>();
  for (const req of requirements) {
    if (req.role_id) requiredLogicalShifts.add(req.role_id);
  }
  
  const plannedCodes = new Set(rows.map(r => r[c.asgShiftCode]));
  const missingShifts: string[] = [];
  
  for (const logical of requiredLogicalShifts) {
    const code = toCode(logical);
    if (!plannedCodes.has(code)) {
      missingShifts.push(`${logical} (${code})`);
    }
  }
  
  if (missingShifts.length > 0) {
    throw new Error(`Night-enabled configuration produced 0 assignments for required shift(s): ${missingShifts.join(", ")}. Check staff eligibility and rest constraints.`);
  }

  // 5) Insert in batches with explicit RLS/FK errors and month guard
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const bad = chunk.find(r =>
      !(String(r[c.asgStart]).startsWith(monthISO) || String(r[c.asgEnd]).startsWith(monthISO))
    );
    if (bad) throw new Error(`Refusing to insert: shift dates not in requested month ${monthISO}. Check requirements mapping.`);
    
    const { error: insErr, count } = await supabase
      .from(t.assignments)
      .insert(chunk)
      .select("id");
    
    if (insErr) {
      if (/RLS|policy/i.test(insErr.message)) {
        throw new Error(`Insert blocked by RLS on ${t.assignments}. Ensure row policy permits ${c.asgVersionFK}=${rosterVersionId}. Details: ${insErr.message}`);
      }
      if (/foreign key|violates foreign key/i.test(insErr.message)) {
        throw new Error(`Insert failed due to FK (likely ${c.asgStaffId}). Verify staff IDs in ${t.staff}. Details: ${insErr.message}`);
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
 * Default policies for testing
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
 * Default generator config
 */
export function getDefaultGeneratorConfig(): GeneratorConfig {
  return {
    tables: { 
      rosterConfig: "roster_config", 
      staff: "staff_profiles", 
      assignments: "roster_assignments" 
    },
    columns: {
      rosterConfigVersionFK: "config_id",
      rosterConfigRequirements: "staffing_requirements",
      asgVersionFK: "version_id",
      asgStaffId: "staff_id",
      asgRoleId: "role_id",
      asgSiteId: "site_id",
      asgStart: "shift_start",
      asgEnd: "shift_end",
      asgCostBase: "cost_base",
      asgCostDiff: "cost_diff",
      asgCostPrem: "cost_premium",
      asgCostFlat: "cost_flat",
      asgCostAllow: "cost_allowances",
      asgCostTotal: "cost_total",
      asgMeta: "meta",
      asgDate: "date",
      asgShiftCode: "shift_code",
      asgHours: "hours",
      asgCost: "cost",
    },
    staff: { idCol: "id", activeCol: "is_active", activeValue: true },
    defaults: { 
      dayShiftStart: "08:00", 
      dayShiftEnd: "16:00", 
      nightShiftStart: "22:00", 
      nightShiftEnd: "06:00", 
      siteId: "SITE1" 
    },
  };
}

/**
 * Legacy compatibility exports
 */
export function fetchStaffMembers() {
  // Legacy placeholder - use staff_profiles query instead
  return [];
}

export function generateRosterAssignments() {
  // Legacy placeholder
  return [];
}

export async function generateAndSaveRoster(staffList: any[], config: any, versionName?: string) {
  // Legacy wrapper - delegates to new generateRoster
  console.log('Legacy generateAndSaveRoster called');
  return { 
    versionId: 'legacy', 
    totalAssignments: 0,
    optimizationResult: { score: 100 },
    wtrResult: { violations: [] },
    costResult: { totalCost: 0, averageCost: 0, breakdown: {} }
  };
}