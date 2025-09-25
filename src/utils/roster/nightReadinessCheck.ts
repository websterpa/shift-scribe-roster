import { StaffMember } from "@/types/roster";

export function checkNightReadiness(input: {
  system: "8h" | "12h";
  staff: StaffMember[];
  allowSupervisorNights?: boolean;
  patternTokens?: string[];
  includeNights?: boolean;
  requiredByDay?: Record<number, Record<string, number>>;
}) {
  console.log("checkNightReadiness: checking readiness", input);

  // Check if nights are expected
  const expectsNights =
    input.system === "12h" ||
    input.includeNights === true ||
    (input.requiredByDay && Object.values(input.requiredByDay).some(r => (r["N"] ?? 0) > 0));

  if (!expectsNights) {
    console.log("checkNightReadiness: nights not expected");
    return { ready: true, issues: [] };
  }

  const issues: string[] = [];

  // Check eligible staff count
  const eligibleNightCount = input.staff.filter(s => 
    !s.role?.includes('supervisor') || input.allowSupervisorNights
  ).length;
  
  if (eligibleNightCount === 0) {
    issues.push("No eligible staff for Night shifts. Enable 'Allow supervisor nights' or add staff who can work nights.");
  }

  // Check pattern compatibility for 12h system
  if (input.system === "12h" && input.patternTokens) {
    const patternHasN = input.patternTokens.some(t => t === "N");
    if (!patternHasN) {
      issues.push("Pattern contains no 'N' tokens for a 12h system. Add N to the pattern or switch to 8h E/L/N.");
    }
  }

  // Check if night shifts are in eligible shifts for staff
  const staffWithNightEligibility = input.staff.filter(s => 
    !s.eligible_shifts || s.eligible_shifts.length === 0 || s.eligible_shifts.includes("N") || s.eligible_shifts.includes("Night")
  );
  
  if (staffWithNightEligibility.length === 0) {
    issues.push("No staff members have Night shifts in their eligible_shifts list.");
  }

  const ready = issues.length === 0;
  
  console.log("checkNightReadiness: result", { ready, issues });
  
  return { ready, issues };
}