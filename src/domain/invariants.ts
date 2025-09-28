import { RosterBuilderInput } from "./rosterSchema";

export type ValidationIssue = { 
  message: string; 
  level: "warning" | "fatal"; 
};

export function validateShiftSetConsistency(input: RosterBuilderInput): ValidationIssue[] {
  // 8h must use E/L/N only in staffing need; 12h must use D/N only
  const allowed = input.system === "8h" ? new Set(["E","L","N"]) : new Set(["D","N"]);
  const bad = input.staffing.flatMap(d =>
    Object.entries(d.need).filter(([k,v]) => v > 0 && !allowed.has(k))
  );
  
  if (bad.length) {
    return [{
      level: "fatal",
      message: `Inconsistent shift-set: ${bad.map(([k])=>k).join(",")} not allowed for ${input.system}`
    }];
  }
  
  return [];
}

export function validateRestRulesPreview(input: RosterBuilderInput): ValidationIssue[] {
  // Basic pattern sanity: check for same-day Day→Night violations
  const tokens = input.pattern.split("");
  const issues: ValidationIssue[] = [];
  
  // Check for adjacent day/night violations on same calendar day
  for (let i = 0; i < tokens.length - 1; i++) {
    const current = tokens[i];
    const next = tokens[i + 1];
    
    // Day to Night on consecutive days = potential rest violation (WARNING, not fatal)
    if ((current === "D" || current === "E" || current === "L") && next === "N") {
      issues.push({
        level: "warning",
        message: `Pattern position ${i + 1}-${i + 2}: ${current}→${next} may violate 11h rest requirement`
      });
    }
  }
  
  return issues;
}

export function validateNightEligibility(input: RosterBuilderInput, staffList: Array<{ role?: string }>): ValidationIssue[] {
  const hasNightRequirements = input.system === "12h" || 
    input.staffing.some(day => day.need.N > 0) ||
    input.pattern.includes("N");
    
  if (!hasNightRequirements) {
    return [];
  }
  
  const nightEligibleStaff = staffList.filter(staff => 
    staff.role !== "Supervisor" || input.allowSupervisorNights
  );
  
  if (nightEligibleStaff.length === 0) {
    return [{
      level: "fatal",
      message: "No staff eligible for Night shifts. Enable 'Allow supervisor nights' or add non-supervisor staff."
    }];
  }
  
  return [];
}