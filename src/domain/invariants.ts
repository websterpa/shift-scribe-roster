import { RosterBuilderInput } from "./rosterSchema";

export function validateShiftSetConsistency(input: RosterBuilderInput) {
  // 8h must use E/L/N only in staffing need; 12h must use D/N only
  const allowed = input.system === "8h" ? new Set(["E","L","N"]) : new Set(["D","N"]);
  const bad = input.staffing.flatMap(d =>
    Object.entries(d.need).filter(([k,v]) => v > 0 && !allowed.has(k))
  );
  if (bad.length) throw new Error(`Inconsistent shift-set: ${bad.map(([k])=>k).join(",")} not allowed for ${input.system}`);
}

export function validateRestRulesPreview(input: RosterBuilderInput) {
  // Basic pattern sanity: check for same-day Day→Night violations
  const tokens = input.pattern.split("");
  const warnings: string[] = [];
  
  // Check for adjacent day/night violations on same calendar day
  for (let i = 0; i < tokens.length - 1; i++) {
    const current = tokens[i];
    const next = tokens[i + 1];
    
    // Day to Night on consecutive days = potential rest violation
    if ((current === "D" || current === "E" || current === "L") && next === "N") {
      warnings.push(`Pattern position ${i + 1}-${i + 2}: ${current}→${next} may violate 11h rest requirement`);
    }
  }
  
  return { warnings };
}

export function validateNightEligibility(input: RosterBuilderInput, staffList: Array<{ role?: string }>) {
  const hasNightRequirements = input.system === "12h" || 
    input.staffing.some(day => day.need.N > 0) ||
    input.pattern.includes("N");
    
  if (!hasNightRequirements) {
    return { eligible: true, warnings: [] };
  }
  
  const nightEligibleStaff = staffList.filter(staff => 
    staff.role !== "Supervisor" || input.allowSupervisorNights
  );
  
  if (nightEligibleStaff.length === 0) {
    return { 
      eligible: false, 
      warnings: ["No staff eligible for Night shifts. Enable 'Allow supervisor nights' or add non-supervisor staff."] 
    };
  }
  
  return { eligible: true, warnings: [] };
}