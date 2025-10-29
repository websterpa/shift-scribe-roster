/* Migrated from utils/roster — canonical version */

/**
 * Rest Validation Utilities
 * 
 * Validates and enforces 11-hour daily rest requirements between shifts.
 * 
 * @module services/roster/helpers/restValidation
 */

import { createLogger } from "@/utils/errorLogger";

const logger = createLogger('RestValidation');

/**
 * Validates that there is at least 11 hours of rest between shifts
 */
export function hasDailyRest(prevShiftEnd: Date | string | null, nextShiftStart: Date | string | null): boolean {
  if (!prevShiftEnd || !nextShiftStart) {
    return true; // No previous shift or no next shift, rest is valid
  }

  try {
    const prevEnd = new Date(prevShiftEnd);
    const nextStart = new Date(nextShiftStart);
    
    if (isNaN(prevEnd.getTime()) || isNaN(nextStart.getTime())) {
      logger.warn('Invalid dates provided for rest validation', { prevShiftEnd, nextShiftStart });
      return true; // Default to valid if dates are invalid
    }

    const restHours = (nextStart.getTime() - prevEnd.getTime()) / (1000 * 60 * 60);
    const hasValidRest = restHours >= 11;
    
    logger.info('Rest validation check', { 
      prevEnd: prevEnd.toISOString(), 
      nextStart: nextStart.toISOString(), 
      restHours: restHours.toFixed(2), 
      hasValidRest 
    });
    
    return hasValidRest;
  } catch (error) {
    logger.error(new Error('Error in rest validation'), { error, prevShiftEnd, nextShiftStart });
    return true; // Default to valid on error
  }
}

/**
 * Enforces 11-hour rest by returning 'R' if rest requirement not met
 */
export function enforceRestRequirement(
  staffId: string, 
  proposedShift: string, 
  prevShiftEnd: Date | string | null, 
  nextShiftStart: Date | string | null
): string {
  if (proposedShift === 'R') {
    return 'R'; // Rest days don't need validation
  }

  if (!hasDailyRest(prevShiftEnd, nextShiftStart)) {
    logger.info('Enforcing rest requirement - changing shift to R', { 
      staffId, 
      proposedShift, 
      prevShiftEnd, 
      nextShiftStart 
    });
    return 'R';
  }

  return proposedShift;
}
