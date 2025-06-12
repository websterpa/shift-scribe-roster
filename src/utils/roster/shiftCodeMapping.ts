
/**
 * Utility for mapping between shift codes and shift names
 * Database stores readable names, generation logic uses single-letter codes
 */

export type ShiftCode = "D" | "E" | "L" | "N" | "R" | "S";
export type ShiftName = "Day" | "Early" | "Late" | "Night" | "Rest" | "Sick";

// Mapping from single-letter codes to readable names
export const SHIFT_CODE_TO_NAME: Record<ShiftCode, ShiftName> = {
  'D': 'Day',
  'E': 'Early', 
  'L': 'Late',
  'N': 'Night',
  'R': 'Rest',
  'S': 'Sick'
};

// Mapping from readable names to single-letter codes
export const SHIFT_NAME_TO_CODE: Record<ShiftName, ShiftCode> = {
  'Day': 'D',
  'Early': 'E',
  'Late': 'L', 
  'Night': 'N',
  'Rest': 'R',
  'Sick': 'S'
};

/**
 * Convert shift code to readable name
 */
export function shiftCodeToName(code: ShiftCode): ShiftName {
  return SHIFT_CODE_TO_NAME[code];
}

/**
 * Convert readable name to shift code
 */
export function shiftNameToCode(name: ShiftName): ShiftCode {
  return SHIFT_NAME_TO_CODE[name];
}

/**
 * Check if a staff member is eligible for a specific shift code
 * Handles the conversion between database shift names and generation codes
 */
export function isStaffEligibleForShift(
  staffEligibleShifts: string[] | null | undefined,
  shiftCode: ShiftCode
): boolean {
  if (!staffEligibleShifts || staffEligibleShifts.length === 0) {
    console.warn('Staff has no eligible shifts configured');
    return false;
  }

  const shiftName = shiftCodeToName(shiftCode);
  
  // Check if the staff is eligible for this shift (by name)
  const isEligible = staffEligibleShifts.includes(shiftName);
  
  console.log(`🔍 Eligibility check: Staff eligible shifts: [${staffEligibleShifts.join(', ')}], checking for: ${shiftName} (${shiftCode}) = ${isEligible}`);
  
  return isEligible;
}

/**
 * Get all shift codes that a staff member is eligible for
 */
export function getEligibleShiftCodes(staffEligibleShifts: string[] | null | undefined): ShiftCode[] {
  if (!staffEligibleShifts || staffEligibleShifts.length === 0) {
    return [];
  }

  return staffEligibleShifts
    .filter((name): name is ShiftName => name in SHIFT_NAME_TO_CODE)
    .map(name => SHIFT_NAME_TO_CODE[name as ShiftName]);
}
