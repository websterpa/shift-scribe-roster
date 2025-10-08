/**
 * Canonical assignment row type for monthly roster display.
 * All columns match the database schema exactly.
 */
export type AssignmentRow = {
  id: string;
  version_id: string;
  date: string;         // YYYY-MM-DD
  shift_code: string;   // E/L/N/D/R/S
  shift_start: string;  // ISO timestamp
  shift_end: string;    // ISO timestamp
  staff_id: string | null;
  hours?: number;
  cost?: number;
};

/**
 * Enriched assignment with staff name resolved
 */
export type EnrichedAssignment = AssignmentRow & {
  staff_name: string;
};
