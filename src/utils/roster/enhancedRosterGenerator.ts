import { StaffMember, Assignment } from "@/types/roster";
import { nightExpectations } from "./validateConfig";
import { buildDemand } from "./buildDemand";
import { resolveShiftWindow } from "./shiftWindows";
import { checkNightReadiness } from "./nightReadinessCheck";

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
  
  if (expects.expectsNights) {
    console.log("[G1] Nights expected, checking readiness");
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
    const dayDate = indexToDate(d.dayIdx);
    const { start, end, overnight } = resolveShiftWindow(d.token as any, input.siteStartHH || 6);
    
    for (let i = 0; i < d.need; i++) {
      // Simple assignment logic - in real implementation would respect constraints
      const availableStaff = input.staff.filter(s => 
        s.is_active && 
        (!s.eligible_shifts || s.eligible_shifts.length === 0 || s.eligible_shifts.includes(d.token)) &&
        (d.token !== "N" || !s.role?.includes('supervisor') || input.allowSupervisorNights)
      );

      if (availableStaff.length === 0) {
        throw new Error(`No available staff for ${d.token} shift on day ${d.dayIdx}. Check eligibility, constraints, or supervisor night rules.`);
      }

      // Pick first available staff (simplified logic)
      const staff = availableStaff[i % availableStaff.length];
      
      result.push({
        version_id: input.versionId,
        staff_id: staff.id,
        date: dayDate,
        shift_code: d.token === "N" ? "Night" : d.token === "D" ? "Day" : d.token === "E" ? "Early" : "Late",
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

  const nightsGenerated = result.filter(a => a.shift_code === "Night").length;

  // 6) Hard assertion for night expectations
  if (expects.expectsNights && nightsGenerated === 0) {
    throw new Error(
      "Night-enabled configuration produced 0 Night assignments. " +
      "Likely causes: supervisor-night restriction, impossible rest windows, or pattern without 'N'."
    );
  }

  console.log("[G2] Enhanced generator completed:", {
    totalAssignments: result.length,
    nightsGenerated,
    tokenCounts: result.reduce((acc, a) => {
      const token = a.shift_code === "Night" ? "N" : a.shift_code === "Day" ? "D" : 
                   a.shift_code === "Early" ? "E" : "L";
      acc[token] = (acc[token] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  });

  return { assignments: result, nightsGenerated };
}