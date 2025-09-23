export function assertNightExpectations(cfg: {
  shiftSystem?: "8h" | "12h";
  includeNights?: boolean;
  requiredByShift?: Record<string, number>;
}) {
  console.log("assertNightExpectations: checking config", cfg);
  
  const expectsNights =
    cfg.shiftSystem === "12h" ||
    (cfg.requiredByShift && (cfg.requiredByShift["N"] ?? 0) > 0) ||
    cfg.includeNights === true;

  console.log("assertNightExpectations: expectsNights =", expectsNights);
  
  return { expectsNights };
}

export function validateRosterResults(cfg: {
  shiftSystem?: "8h" | "12h";
  includeNights?: boolean;
  requiredByShift?: Record<string, number>;
}, assignments: Array<{ token?: string; shift_code?: string }>) {
  const { expectsNights } = assertNightExpectations(cfg);
  
  if (expectsNights) {
    const nightCount = assignments.filter(a => 
      (a.token === "N") || 
      (a.shift_code === "Night") || 
      (a.shift_code === "N")
    ).length;
    
    console.log("validateRosterResults: found", nightCount, "night assignments, expected nights:", expectsNights);
    
    if (nightCount === 0) {
      throw new Error(
        "Night-enabled configuration produced 0 Night assignments. " +
        "Check pattern, coverage targets, or constraints (rest windows, supervisor rules)."
      );
    }
  }
  
  return { validated: true };
}