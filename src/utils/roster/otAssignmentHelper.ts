import { OTOptions } from "@/utils/shiftWindowResolver";
import { ShiftCode } from "../constraints";

/**
 * Helper functions for creating variable OT assignments
 */

export interface OTAssignmentRequest {
  staffId: string;
  dateISO: string;
  /** Duration in hours (e.g., 4, 3.5, 8) */
  otHours: number;
  /** Local start time HH:mm (e.g., "10:00", "14:30") */
  otStartLocalTime?: string;
  /** Reason for OT (optional) */
  reason?: string;
}

/**
 * Create an OT cycle entry with custom hours and timing
 * 
 * Example usage:
 * ```typescript
 * // 4-hour top-up starting at 10:00
 * const otEntry = createOTCycleEntry(0, "staff-123", {
 *   otHours: 4,
 *   otStartLocalTime: "10:00"
 * });
 * 
 * // 3.5-hour evening cover starting at 18:30
 * const eveningCover = createOTCycleEntry(5, "staff-456", {
 *   otHours: 3.5,
 *   otStartLocalTime: "18:30"
 * });
 * ```
 */
export function createOTCycleEntry(
  day: number,
  staffId: string,
  otOptions: OTOptions,
  dateISO?: string
) {
  return {
    day,
    staffId,
    shiftCode: "OT" as const,
    date: dateISO || "", // Will be calculated by assignment generator if empty
    otOptions
  };
}

/**
 * Create multiple OT assignments for different scenarios
 */
export function createCommonOTPatterns() {
  return {
    /** 4-hour morning top-up (common for coverage gaps) */
    morningTopUp: (day: number, staffId: string) => createOTCycleEntry(day, staffId, {
      otHours: 4,
      otStartLocalTime: "10:00"
    }),

    /** 6-hour afternoon/evening cover */
    afternoonCover: (day: number, staffId: string) => createOTCycleEntry(day, staffId, {
      otHours: 6,
      otStartLocalTime: "14:00"
    }),

    /** 3-hour evening top-up */
    eveningTopUp: (day: number, staffId: string) => createOTCycleEntry(day, staffId, {
      otHours: 3,
      otStartLocalTime: "18:00"
    }),

    /** Flexible hours with custom start time */
    custom: (day: number, staffId: string, hours: number, startTime: string) => 
      createOTCycleEntry(day, staffId, {
        otHours: hours,
        otStartLocalTime: startTime
      }),

    /** Standard system-length OT (8h or 12h depending on shift system) */
    standard: (day: number, staffId: string) => createOTCycleEntry(day, staffId, {
      // No options = uses system defaults
    })
  };
}

/**
 * Validate OT assignment request
 */
export function validateOTRequest(request: OTAssignmentRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request.staffId) {
    errors.push("Staff ID is required");
  }

  if (!request.dateISO) {
    errors.push("Date is required");
  }

  if (!Number.isFinite(request.otHours) || request.otHours <= 0) {
    errors.push("OT hours must be a positive number");
  }

  if (request.otHours > 24) {
    errors.push("OT hours cannot exceed 24 hours per day");
  }

  if (request.otStartLocalTime) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(request.otStartLocalTime)) {
      errors.push("Start time must be in HH:mm format (e.g., '10:00', '18:30')");
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Example: Build a roster cycle with mixed regular and OT shifts
 */
export function buildMixedCycleExample() {
  const patterns = createCommonOTPatterns();
  
  return [
    // Regular shifts
    { day: 0, staffId: "staff-1", shiftCode: "E", date: "" },
    { day: 0, staffId: "staff-2", shiftCode: "L", date: "" },
    { day: 0, staffId: "staff-3", shiftCode: "N", date: "" },
    
    // Variable OT assignments
    patterns.morningTopUp(0, "staff-4"),      // 4h at 10:00
    patterns.afternoonCover(1, "staff-1"),    // 6h at 14:00  
    patterns.custom(2, "staff-2", 3.5, "19:00"), // 3.5h at 19:00
    
    // Rest day
    { day: 3, staffId: "staff-1", shiftCode: "R", date: "" },
    
    // More OT examples
    patterns.eveningTopUp(4, "staff-3"),      // 3h at 18:00
    patterns.standard(5, "staff-4")           // System default hours
  ];
}