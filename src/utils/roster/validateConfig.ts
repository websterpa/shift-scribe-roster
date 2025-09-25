export function nightExpectations(input: {
  system: "8h" | "12h"; 
  requiredByDay?: Record<number, Record<string, number>>; 
  includeNights?: boolean;
}) {
  console.log("nightExpectations: checking input", input);
  
  const expectsNights =
    input.system === "12h" ||
    input.includeNights === true ||
    (input.requiredByDay && Object.values(input.requiredByDay).some(r => (r["N"] ?? 0) > 0));

  console.log("nightExpectations: expectsNights =", expectsNights);
  
  return { expectsNights };
}

export function validateRosterResults(cfg: {
  shiftSystem?: "8h" | "12h";
  includeNights?: boolean;
  requiredByShift?: Record<string, number>;
}, assignments: Array<{ token?: string; shift_code?: string }>) {
  const { expectsNights } = nightExpectations({
    system: cfg.shiftSystem || "8h",
    includeNights: cfg.includeNights
  });
  
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