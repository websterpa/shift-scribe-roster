/**
 * Pattern Helpers
 * 
 * Utility functions for working with shift pattern sequences
 */

/**
 * Rotate a pattern sequence by a given offset
 * 
 * @example
 * rotateSequence(['E','L','N','R'], 2) => ['N','R','E','L']
 * 
 * @param sequence - The original pattern sequence
 * @param offset - Number of positions to rotate (0 = no rotation)
 * @returns Rotated sequence
 */
export function rotateSequence<T>(sequence: T[], offset: number): T[] {
  if (!sequence || sequence.length === 0) {
    return sequence;
  }
  
  // Normalize offset to be within sequence length
  const normalizedOffset = ((offset % sequence.length) + sequence.length) % sequence.length;
  
  if (normalizedOffset === 0) {
    return sequence;
  }
  
  // Rotate: take elements from offset onwards, then prepend elements before offset
  return [...sequence.slice(normalizedOffset), ...sequence.slice(0, normalizedOffset)];
}

/**
 * Get the shift code for a specific day in a pattern
 * 
 * @param sequence - The pattern sequence
 * @param dayIndex - The day index (0 = first day of roster)
 * @param offset - Pattern offset for this staff member
 * @param cycleLength - Pattern cycle length (defaults to sequence length)
 * @returns Shift code for that day
 */
export function getShiftCodeForDay(
  sequence: string[],
  dayIndex: number,
  offset: number = 0,
  cycleLength?: number
): string {
  if (!sequence || sequence.length === 0) {
    return 'R'; // Default to rest if no pattern
  }
  
  const cycle = cycleLength || sequence.length;
  const patternIndex = (dayIndex + offset) % cycle;
  
  return sequence[patternIndex] || 'R';
}

/**
 * Validate if a shift code is a rest day
 */
export function isRestDay(shiftCode: string): boolean {
  return shiftCode === 'R' || shiftCode === 'Rest' || shiftCode === 'OFF';
}

/**
 * Calculate pattern adherence percentage
 * 
 * @param expectedSequence - Expected pattern sequence
 * @param actualShifts - Actual shifts assigned
 * @param offset - Pattern offset
 * @returns Adherence percentage (0-100)
 */
export function calculatePatternAdherence(
  expectedSequence: string[],
  actualShifts: Array<{ dateISO: string; shiftCode: string }>,
  offset: number = 0
): number {
  if (actualShifts.length === 0) {
    return 0;
  }
  
  let matches = 0;
  actualShifts.forEach((shift, index) => {
    const expectedCode = getShiftCodeForDay(expectedSequence, index, offset);
    if (shift.shiftCode === expectedCode) {
      matches++;
    }
  });
  
  return (matches / actualShifts.length) * 100;
}
