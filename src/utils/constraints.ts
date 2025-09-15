export type ShiftSystem = "8h" | "12h";
export type ShiftCode = "E" | "L" | "N" | "D" | "R" | "OT" | "A/L" | "S" | "SP" | "CL";

export interface Staff {
  id: string;
  name: string;
  role: "Staff" | "Supervisor";
  hourlyRate: number; // base
  optedOut48h?: boolean; // default true per brief
  eligibleShiftCodes: ShiftCode[]; // e.g., Supervisors exclude 'N' by default
}

export interface CoverageTarget {
  // by weekday index 0..6
  [weekday: number]: { [shiftCode in ShiftCode]?: number };
}

export interface GenerationConfig {
  startDateISO: string;    // roster start date (Monday preferred)
  weeks: number;           // default 17
  shiftSystem: ShiftSystem; // "8h" or "12h"
  allowSupervisorNights?: boolean; // default false
  coverage: CoverageTarget;
  publicHolidaysISO?: string[]; // dates
  budget?: number | null;  // optional overall budget for horizon
  capPublicHolidaysPerPerson?: number; // default 2 per 17w
}

export const SHIFT_SETS: Record<ShiftSystem, ShiftCode[]> = {
  "8h": ["E", "L", "N"],
  "12h": ["D", "N"],
};

export function isWorkCode(code: ShiftCode) {
  return ["E","L","N","D","OT"].includes(code);
}

export function isLeaveCode(code: ShiftCode) {
  return ["A/L","S","SP","CL"].includes(code);
}

export function isRest(code: ShiftCode) {
  return code === "R";
}

export function ensureShiftSystemConsistency(code: ShiftCode, system: ShiftSystem) {
  const allowed = new Set(SHIFT_SETS[system].concat(["R","OT","A/L","S","SP","CL"]));
  return allowed.has(code);
}