
import { isPublicHoliday } from "../dateHelpers";
import { shiftCost, durationHours } from "../costing";
import { ShiftCode } from "../constraints";

export interface ShiftDetails {
  shiftStart: Date | null;
  shiftEnd: Date | null;
  hours: number;
}

export function calculateShiftDetails(
  code: string,
  dateObj: Date,
  shiftType: "8h" | "12h",
  handshakeMinutes: number,
  options?: {
    /** For OT: custom hours override */
    otHours?: number;
    /** For OT: custom start time override */
    otStartTime?: { hour: number; minute: number };
  }
): ShiftDetails {
  if (code === "R" || code === "S") {
    return { shiftStart: null, shiftEnd: null, hours: 0 };
  }

  const shiftStart = new Date(dateObj);
  let shiftEnd: Date;
  let hours: number;

  if (code === "OT") {
    // Handle variable OT shifts
    hours = options?.otHours ?? (shiftType === "12h" ? 12 : 8); // fallback to system default
    
    if (options?.otStartTime) {
      shiftStart.setHours(options.otStartTime.hour, options.otStartTime.minute, 0, 0);
    } else {
      // Default OT start time based on shift system
      if (shiftType === "12h") {
        shiftStart.setHours(7, 0, 0, 0); // Start at Day shift time
      } else {
        shiftStart.setHours(7, 45, 0, 0); // Start at Early shift time
      }
    }
    
    shiftEnd = new Date(shiftStart.getTime() + hours * 60 * 60 * 1000);
  } else if (shiftType === "12h") {
    // 12h: Day = 07:00–19:00, Night = 19:00–07:00 next day
    if (code === "D") {
      shiftStart.setHours(7, 0);
      shiftEnd = new Date(shiftStart);
      shiftEnd.setHours(19, 0);
    } else {
      shiftStart.setHours(19, 0);
      shiftEnd = new Date(shiftStart);
      shiftEnd.setDate(shiftEnd.getDate() + 1);
      shiftEnd.setHours(7, 0);
    }
    hours = 12;
  } else {
    // 8h: Early = 07:45–15:45, Late = 15:45–23:45, Night = 23:45–07:45 next day
    if (code === "E") {
      shiftStart.setHours(7, 45);
      shiftEnd = new Date(shiftStart);
      shiftEnd.setHours(15, 45);
    } else if (code === "L") {
      shiftStart.setHours(15, 45);
      shiftEnd = new Date(shiftStart);
      shiftEnd.setHours(23, 45);
    } else {
      shiftStart.setHours(23, 45);
      shiftEnd = new Date(shiftStart);
      shiftEnd.setDate(shiftEnd.getDate() + 1);
      shiftEnd.setHours(7, 45);
    }
    hours = 8;
  }

  // Apply handshake only if configured (greater than 0) and not OT
  if (handshakeMinutes > 0 && code !== "OT") {
    shiftEnd = new Date(shiftEnd.getTime() + handshakeMinutes * 60 * 1000);
    console.log(`🤝 Applied ${handshakeMinutes} minute handover to shift ending at ${shiftEnd.toLocaleTimeString()}`);
  }

  return { shiftStart, shiftEnd, hours };
}

/**
 * Updated to use the new costing system with proper OT multipliers
 */
export function calculateShiftCost(
  code: ShiftCode,
  dateISO: string,
  hourlyRate: number,
  options?: {
    /** Start and end times for accurate duration calculation */
    start?: Date;
    end?: Date;
    /** Or explicit hours override */
    hoursOverride?: number;
    /** Public holidays list */
    publicHolidays?: string[];
  }
): number {
  return shiftCost(
    hourlyRate,
    code,
    dateISO,
    options?.publicHolidays || [],
    {
      start: options?.start,
      end: options?.end,
      hoursOverride: options?.hoursOverride
    }
  );
}

// Legacy function for backward compatibility
export function calculateShiftCostLegacy(
  hours: number,
  hourlyRate: number,
  dateObj: Date,
  holidayMultiplier: number = 1
): number {
  const dateISO = dateObj.toISOString().split('T')[0];
  const isPH = isPublicHoliday(dateObj);
  const multiplier = isPH ? holidayMultiplier : 1;
  return hourlyRate * hours * multiplier;
}
