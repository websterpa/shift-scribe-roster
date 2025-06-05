
type ShiftCode = "D" | "E" | "L" | "N" | "R";

interface CycleAssignment {
  [weekIndex: number]: { [dayIndex: number]: { [staffId: string]: ShiftCode } };
}

export function buildRosterCycle(
  staffList: Array<{ id: string; eligible_shifts: string[]; is_shift_worker: boolean }>,
  cycleWeeks: number,
  shiftType: "8h" | "12h",
  operationalHours: number,
  handshakeMinutes: number
): CycleAssignment {
  const assignment: CycleAssignment = {};

  for (let w = 0; w < cycleWeeks; w++) {
    assignment[w] = {};
    for (let d = 0; d < 7; d++) {
      assignment[w][d] = {};
      staffList.forEach((staff, idx) => {
        const base = (idx + w) % staffList.length;
        const eligible = staffList[base].eligible_shifts;
        let code: ShiftCode = "R";

        if (shiftType === "12h") {
          // Alternate D/N each day
          code = (w + d + idx) % 2 === 0 ? "D" : "N";
        } else {
          // 8h: determine number of shifts = operationalHours / 8
          const shiftsPerDay = operationalHours / 8;
          const slot = (w * 7 + d + idx) % (shiftsPerDay + 1);
          if (slot === shiftsPerDay) code = "R";
          else code = eligible.includes(slot === 0 ? "E" : "L") ? (slot === 0 ? "E" : "L") : "R";
        }

        // Supervisors only if shift_worker OR Day shift
        if (!staff.is_shift_worker && code !== "D") {
          code = "R";
        }

        assignment[w][d][staff.id] = code;
      });
    }
  }
  return assignment;
}
