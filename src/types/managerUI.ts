export type ShiftSystem = "8h" | "12h";

export interface ManagerRosterForm {
  shiftSystem: ShiftSystem;
  siteStartLocalTime: string;      // "HH:mm"
  timezone: string;                // IANA, e.g., "Europe/London"
  weeks: number;                   // default 17
  allowSupervisorNights: boolean;  // default false
  capPublicHolidaysPerPerson: number; // default 2
  budget?: number | null;          // optional
  defaultOtHours?: number | null;  // e.g., 4
  defaultOtStartLocalTime?: string | null; // "HH:mm" or null
  coverageJSON: string;            // JSON string the manager can paste/edit
  patternSequence?: string[];      // Array of pattern tokens
}

export interface RosterSummary {
  coverageAchievedPct: number; // 0..100
  totalCost: number;
  budget?: number | null;
  budgetVariance?: number | null; // +over / -under
  fairness: {
    nights: { min: number; avg: number; max: number };
    weekends: { min: number; avg: number; max: number };
    publicHolidays: { min: number; avg: number; max: number; cap?: number };
  };
  violations: string[]; // any compliance messages
  notes?: string[];
}

export interface GenerateRosterResult {
  ok: boolean;
  summary: RosterSummary;
  // You likely already return assignments/ids; keep them if present.
  // assignments?: any;
}
