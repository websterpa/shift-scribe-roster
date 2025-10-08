import { StaffMember, Assignment } from "@/types/roster";
import { nightExpectations } from "./validateConfig";
import { buildDemand } from "./buildDemand";
import { checkNightReadiness } from "./nightReadinessCheck";
import { assertShiftToken, ShiftToken } from "@/domain/shifts";
import { respectsRestRules, ShiftWindowResolver } from "../restValidation";
import { makeShiftWindowResolver } from "../shiftWindowResolver";
import { ShiftCode, isWorkCode } from "../constraints";

export interface GeneratorInput {
  system: "8h" | "12h";
  versionId: string;
  staff: StaffMember[];
  requirementsByDay: Record<number, Record<string, number>>;
  startDate: string;
  siteStartHH?: number;
  allowSupervisorNights?: boolean;
  includeNights?: boolean;
  patternTokens?: string[];
}

export interface GeneratorResult {
  assignments: Assignment[];
  nightsGenerated: number;
}

export function generateRosterEnhanced(input: GeneratorInput): GeneratorResult {
  console.log("[G1] Enhanced generator starting with input:", input);

  // 1) Expand weekly requirements across full horizon
  const horizonDays = (input.patternTokens?.length || 14); // Use pattern length as horizon
  const expandedReqs: Record<number, Record<string, number>> = {};
  
  for (let dayIdx = 0; dayIdx < horizonDays; dayIdx++) {
    const weekday = dayIdx % 7; // Map to 0-6 weekday
    if (input.requirementsByDay[weekday]) {
      expandedReqs[dayIdx] = input.requirementsByDay[weekday];
    }
  }
  
  console.log("[G1] Expanded requirements from", Object.keys(input.requirementsByDay).length, "weekdays to", horizonDays, "days");
  
  // 2) Build demand from expanded requirements
  const demand = buildDemand(input.system, expandedReqs);
  console.log("[G1] Built demand:", demand);

  // 2) Check night readiness before proceeding
  const expects = nightExpectations({ 
    system: input.system, 
    requiredByDay: input.requirementsByDay, 
    includeNights: input.includeNights 
  });
  
  // 1) Enhanced pool selection per token with eligibility checks
  const allStaffIds = input.staff.filter(s => s.is_active).map(s => s.id);
  
  // Night pool: consider role AND eligible_shifts
  const nightPool = input.staff.filter(s => {
    if (!s.is_active) return false;
    
    // Check role-based eligibility
    const roleOk = !s.role?.includes('supervisor') || input.allowSupervisorNights;
    if (!roleOk) return false;
    
    // Check eligible_shifts if defined
    if (s.eligible_shifts && s.eligible_shifts.length > 0) {
      // Accept "N" or "Night" in eligible_shifts
      return s.eligible_shifts.some(shift => 
        shift === 'N' || shift === 'Night' || shift === 'night'
      );
    }
    
    // If no eligible_shifts defined, allow by default (configurable)
    return true;
  }).map(s => s.id);

  function poolFor(token: "D"|"N"|"E"|"L"): string[] {
    return token === "N" ? nightPool : allStaffIds;
  }
  
  // DEV diagnostic: Log pool sizes
  if (import.meta.env.DEV) {
    console.log('[G1] Staff pools:', {
      total: allStaffIds.length,
      nightEligible: nightPool.length,
      nightPoolStaff: nightPool.map(id => {
        const s = input.staff.find(x => x.id === id);
        return `${s?.name || id} (${s?.role || 'staff'}, eligible: ${s?.eligible_shifts?.join(',') || 'default'})`;
      })
    });
  }
  
  if (expects.expectsNights) {
    console.log("[G1] Nights expected, checking readiness");
    
    if (nightPool.length === 0) {
      throw new Error("No eligible staff for Night shifts: all staff are supervisors and 'Allow supervisor nights' is disabled.");
    }
    
    const readiness = checkNightReadiness({
      system: input.system,
      staff: input.staff,
      allowSupervisorNights: input.allowSupervisorNights,
      patternTokens: input.patternTokens,
      includeNights: input.includeNights,
      requiredByDay: input.requirementsByDay
    });
    
    if (!readiness.ready) {
      const errorMsg = "Night readiness check failed: " + readiness.issues.join(", ");
      console.error("[G1]", errorMsg);
      throw new Error(errorMsg);
    }
  }

  // 3) Sort demand: Nights first, then others
  const nights = demand.filter(d => d.token === "N").sort((a, b) => a.dayIdx - b.dayIdx);
  const others = demand.filter(d => d.token !== "N");
  
  console.log("[G1] Processing nights first:", nights.length, "then others:", others.length);

  const result: Assignment[] = [];
  
  // Setup shift window resolver for rest validation
  const resolveShiftWindow = makeShiftWindowResolver({
    shiftSystem: input.system,
    siteStartLocalTime: input.siteStartHH ? `${String(input.siteStartHH).padStart(2, '0')}:00` : '07:00',
    timezone: 'Europe/London'
  });

  // Track last worked info for rest validation
  const lastWorkedEndByStaff: Record<string, Date | null> = {};
  const prevWorkedDateByStaff: Record<string, string | null> = {};
  const prevWorkedCodeByStaff: Record<string, ShiftCode | null> = {};

  // 3) Availability date key / timezone - build dayISO in site timezone
  function indexToDate(dayIdx: number): string {
    const startDate = new Date(input.startDate);
    const targetDate = new Date(startDate);
    targetDate.setDate(startDate.getDate() + dayIdx);
    return targetDate.toISOString().split('T')[0];
  }

  // 2) Make day 0 rest-safe
  function isEligibleForToken(staffId: string, token: string, dayISO: string): boolean {
    const staff = input.staff.find(s => s.id === staffId);
    if (!staff || !staff.is_active) return false;

    // Check basic shift eligibility
    if (staff.eligible_shifts && staff.eligible_shifts.length > 0) {
      const shiftName = token === 'D' ? 'Day' : token === 'E' ? 'Early' : token === 'L' ? 'Late' : token === 'N' ? 'Night' : '';
      if (shiftName && !staff.eligible_shifts.includes(shiftName)) return false;
    }

    // Get previous assignment info
    const prevEnd = lastWorkedEndByStaff[staffId];
    const prevDateISO = prevWorkedDateByStaff[staffId];
    const prevCode = prevWorkedCodeByStaff[staffId];
    
    if (!prevEnd || !prevDateISO || !prevCode) {
      // First day in horizon (or no prior history) → skip previous-day rest window check
      return true; // isAvailable(staffId, dayISO, token); - simplified for now
    }

    // existing checks with prev - use rest validation for subsequent days
    return respectsRestRules(
      prevEnd,
      prevDateISO,
      prevCode,
      dayISO,
      token as ShiftCode,
      resolveShiftWindow
    );
  }

  // 4) Diagnostics helper for pool exclusions
  function explainPoolExclusions(pool: string[], options: { token: string; dayISO: string }) {
    const results = {
      total: pool.length,
      eligible: 0,
      restWindow: 0,
      roleBlocked: 0,
      unavailable: 0
    };

    pool.forEach(staffId => {
      if (isEligibleForToken(staffId, options.token, options.dayISO)) {
        results.eligible++;
      } else {
        const staff = input.staff.find(s => s.id === staffId);
        if (!staff) return;

        // Check role blocking
        if (options.token === 'N' && staff.role?.includes('supervisor') && !input.allowSupervisorNights) {
          results.roleBlocked++;
        } else if (!isEligibleForToken(staffId, options.token, options.dayISO)) {
          results.restWindow++;
        } else {
          results.unavailable++;
        }
      }
    });

    const summary = `${results.eligible}/${results.total} eligible (rest:${results.restWindow}, role:${results.roleBlocked}, unavail:${results.unavailable})`;
    return { ...results, summary };
  }

  function assignShift(d: { dayIdx: number; token: string; need: number }) {
    const dayDate = indexToDate(d.dayIdx); // anchor to start day
    
    for (let i = 0; i < d.need; i++) {
      // Use poolFor to get correct staff pool per token
      const staffPool = poolFor(d.token as "D"|"N"|"E"|"L");
      
      // 4) Add dev logs for pool size and day-0 failures
      if (import.meta.env.DEV && d.dayIdx === 0) {
        console.info(`[ELIG] day0 ${d.token} pool`, { 
          size: staffPool.length, 
          dayISO: dayDate, 
          token: d.token 
        });
      }

      // Filter by rest eligibility  
      const availableStaffIds = staffPool.filter(staffId => isEligibleForToken(staffId, d.token, dayDate));
      const availableStaff = availableStaffIds.map(id => input.staff.find(s => s.id === id)).filter(Boolean) as StaffMember[];

      if (availableStaff.length === 0) {
        // 4) Optional diagnostics before throwing error
        if (import.meta.env.DEV) {
          const reasons = explainPoolExclusions(staffPool, { token: d.token, dayISO: dayDate });
          console.error(`[ELIG_FAIL] ${d.token} dayIdx ${d.dayIdx}`, reasons);
          throw new Error(`No available staff for ${d.token} shift on day ${d.dayIdx}. ${reasons.summary}`);
        } else {
          throw new Error(`No available staff for ${d.token} shift on day ${d.dayIdx}. Check eligibility, constraints, or supervisor night rules.`);
        }
      }

      // Pick first available staff (simplified logic)
      const staff = availableStaff[i % availableStaff.length];
      
      // Use token directly as shift_code to satisfy DB CHECK constraint
      const shiftToken = d.token as ShiftToken;
      assertShiftToken(shiftToken);
      
      // Get shift window for timing
      const shiftWindow = resolveShiftWindow(dayDate, shiftToken);
      if (!shiftWindow) {
        throw new Error(`Could not resolve shift window for ${shiftToken} on ${dayDate}`);
      }
      
      // Update tracking for rest validation
      if (isWorkCode(shiftToken)) {
        lastWorkedEndByStaff[staff.id] = shiftWindow.end;
        prevWorkedDateByStaff[staff.id] = dayDate;
        prevWorkedCodeByStaff[staff.id] = shiftToken;
      }
      
      result.push({
        version_id: input.versionId,
        staff_id: staff.id,
        date: dayDate, // anchor to start day
        shift_code: shiftToken, // Write token directly
        shift_start: shiftWindow.start.toISOString(),
        shift_end: shiftWindow.end.toISOString(),
        hours: d.token === "N" || d.token === "D" ? 12 : 8,
        cost: (d.token === "N" || d.token === "D" ? 12 : 8) * 18 // Simplified costing
      });
    }
  }

  // 4) Assign nights first
  nights.forEach(assignShift);
  
  // 5) Then assign others  
  others.forEach(assignShift);

  const nightsGenerated = result.filter(a => a.shift_code === "N").length;

  // 6) Hard assertion for night expectations
  if (expects.expectsNights && nightsGenerated === 0) {
    throw new Error(
      "Night-enabled configuration produced 0 Night assignments — likely token drift or eligibility/shift-set bug."
    );
  }

  const tokenCounts = result.reduce((acc, a) => {
    // shift_code is now already a token
    const token = a.shift_code;
    acc[token] = (acc[token] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("[G2] Enhanced generator completed:", {
    totalAssignments: result.length,
    nightsGenerated,
    tokenCounts
  });

  return { assignments: result, nightsGenerated };
}