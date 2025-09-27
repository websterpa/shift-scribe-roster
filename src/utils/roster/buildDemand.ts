export function buildDemand(
  system: "8h" | "12h", 
  reqByDay: Record<number, Record<string, number>>
) {
  console.log("buildDemand: building demand for system", system, "with requirements", reqByDay);
  
  // Fixed shift sets based on system - ensure 12h includes D and N (no collapse)
  const shiftSet = system === "8h" ? (["E", "L", "N"] as const) : (["D", "N"] as const);
  
  const list: { dayIdx: number; token: "D"|"N"|"E"|"L"; need: number }[] = [];
  
  Object.entries(reqByDay).forEach(([d, row]) => {
    shiftSet.forEach(t => { 
      const v = Number(row[t] ?? 0);
      if (v > 0) {
        list.push({ dayIdx: Number(d), token: t, need: v });
      }
    });
  });
  
  console.log("buildDemand: generated demand list", list);
  return list;
}