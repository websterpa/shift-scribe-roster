
import { isPublicHoliday } from "../dateHelpers";

export interface ShiftDetails {
  shiftStart: Date | null;
  shiftEnd: Date | null;
  hours: number;
}

export function calculateShiftDetails(
  code: string,
  dateObj: Date,
  shiftType: "8h" | "12h",
  handshakeMinutes: number
): ShiftDetails {
  if (code === "R" || code === "S") {
    return { shiftStart: null, shiftEnd: null, hours: 0 };
  }

  const shiftStart = new Date(dateObj);
  let shiftEnd: Date;
  let hours: number;

  if (shiftType === "12h") {
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

  // Apply handshake only if configured (greater than 0)
  if (handshakeMinutes > 0) {
    shiftEnd = new Date(shiftEnd.getTime() + handshakeMinutes * 60 * 1000);
    console.log(`🤝 Applied ${handshakeMinutes} minute handover to shift ending at ${shiftEnd.toLocaleTimeString()}`);
  }

  return { shiftStart, shiftEnd, hours };
}

export function calculateShiftCost(
  hours: number,
  hourlyRate: number,
  dateObj: Date,
  holidayMultiplier: number
): number {
  const isPH = isPublicHoliday(dateObj);
  const multiplier = isPH ? holidayMultiplier : 1;
  return hourlyRate * hours * multiplier;
}
