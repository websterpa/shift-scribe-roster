import { StaffMember, Assignment } from "@/types/roster";
import { nightExpectations } from "./validateConfig";
import { buildDemand } from "./buildDemand";
import { resolveShiftWindow } from "./shiftWindows";
import { checkNightReadiness } from "./nightReadinessCheck";
import { assertShiftToken, ShiftToken } from "@/domain/shifts";

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

  // 1) Build demand from requirements
  const demand = buildDemand(input.system, input.requirementsByDay);
  console.log("[G1] Built demand:", demand);

  // 2) Check night readiness before proceeding
  const expects = nightExpectations({ 
    system: input.system, 
    requiredByDay: input.requirementsByDay, 
    includeNights: input.includeNights 
  });
  
  // Night eligibility pool (site-configured supervisor rule)
  const nightPool = input.staff.filter(s => 
    s.is_active && 
    (!s.role?.includes('supervisor') || input.allowSupervisorNights)
  );
  
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

  function indexToDate(dayIdx: number): string {
    const startDate = new Date(input.startDate);
    const targetDate = new Date(startDate);
    targetDate.setDate(startDate.getDate() + dayIdx);
    return targetDate.toISOString().split('T')[0];
  }

  function assignShift(d: { dayIdx: number; token: string; need: number }) {
    const dayDate = indexToDate(d.dayIdx); // anchor to start day
    const { start, end, overnight } = resolveShiftWindow(d.token as any, input.siteStartHH || 6);
    
    for (let i = 0; i < d.need; i++) {
      // For Nights, use night-eligible pool; for others, use all active staff
      const availableStaff = d.token === "N" ? nightPool : input.staff.filter(s => 
        s.is_active && 
        (!s.eligible_shifts || s.eligible_shifts.length === 0 || s.eligible_shifts.includes(d.token))
      );

      if (availableStaff.length === 0) {
        throw new Error(`No available staff for ${d.token} shift on day ${d.dayIdx}. Check eligibility, constraints, or supervisor night rules.`);
      }

      // Pick first available staff (simplified logic)
      const staff = availableStaff[i % availableStaff.length];
      
      // Use token directly as shift_code to satisfy DB CHECK constraint
      const shiftToken = d.token as ShiftToken;
      assertShiftToken(shiftToken);
      
      result.push({
        version_id: input.versionId,
        staff_id: staff.id,
        date: dayDate, // anchor to start day
        shift_code: shiftToken, // Write token directly
        shift_start: new Date(`${dayDate}T${start}`).toISOString(),
        shift_end: new Date(`${overnight ? indexToDate(d.dayIdx + 1) : dayDate}T${end}`).toISOString(),
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