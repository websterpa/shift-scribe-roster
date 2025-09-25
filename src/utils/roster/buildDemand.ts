export function buildDemand(
  system: "8h" | "12h", 
  reqByDay: Record<number, Record<string, number>>
) {
  console.log("buildDemand: building demand for system", system, "with requirements", reqByDay);
  
  // Fixed shift sets based on system
  const shiftSet = system === "8h" ? (["E", "L", "N"] as const) : (["D", "N"] as const);
  
  const list: { dayIdx: number; token: string; need: number }[] = [];
  
  Object.entries(reqByDay).forEach(([d, row]) => {
    shiftSet.forEach(t => { 
      if ((row[t] ?? 0) > 0) {
        list.push({ dayIdx: +d, token: t, need: row[t]! });
      }
    });
  });
  
  console.log("buildDemand: generated demand list", list);
  return list;
}