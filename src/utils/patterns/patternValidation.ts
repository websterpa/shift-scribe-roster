
import { createLogger } from "../errorLogger";

const logger = createLogger('PatternValidation');

export interface PatternValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a shift pattern array for correctness
 */
export function validatePattern(pattern: string[], shiftType: '8h' | '12h'): PatternValidationResult {
  logger.info('Validating pattern', { pattern, shiftType });
  
  const result: PatternValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Rule 1: Pattern cannot be empty
  if (!pattern || pattern.length === 0) {
    result.errors.push('Pattern cannot be empty');
    result.isValid = false;
    return result;
  }

  // Rule 2: Valid shift codes only
  const validCodes = ['E', 'D', 'L', 'N', 'R'];
  const invalidCodes = pattern.filter(code => !validCodes.includes(code));
  if (invalidCodes.length > 0) {
    result.errors.push(`Invalid shift codes: ${invalidCodes.join(', ')}`);
    result.isValid = false;
  }

  // Rule 3: Must have at least one rest day
  const restDays = pattern.filter(code => code === 'R').length;
  if (restDays === 0) {
    result.errors.push('Pattern must include at least one rest day (R)');
    result.isValid = false;
  }

  // Rule 4: Check for alternating patterns (RWRWRW type)
  let alternatingCount = 0;
  for (let i = 0; i < pattern.length - 1; i++) {
    if ((pattern[i] === 'R' && pattern[i + 1] !== 'R') || 
        (pattern[i] !== 'R' && pattern[i + 1] === 'R')) {
      alternatingCount++;
    }
  }
  if (alternatingCount > pattern.length * 0.6) {
    result.warnings.push('Pattern appears to alternate frequently between work and rest');
  }

  // Rule 5: Check for excessive consecutive work days
  let maxConsecutiveWork = 0;
  let currentConsecutiveWork = 0;
  
  for (const code of pattern) {
    if (code !== 'R') {
      currentConsecutiveWork++;
      maxConsecutiveWork = Math.max(maxConsecutiveWork, currentConsecutiveWork);
    } else {
      currentConsecutiveWork = 0;
    }
  }

  if (maxConsecutiveWork > 6) {
    result.errors.push(`Too many consecutive work days: ${maxConsecutiveWork}. Maximum recommended is 6.`);
    result.isValid = false;
  } else if (maxConsecutiveWork > 4) {
    result.warnings.push(`Long consecutive work period: ${maxConsecutiveWork} days`);
  }

  // Rule 6: 8h specific - no Late before Early
  if (shiftType === '8h') {
    for (let i = 0; i < pattern.length - 1; i++) {
      if (pattern[i] === 'L' && pattern[i + 1] === 'E') {
        result.errors.push('Late shift cannot be immediately followed by Early shift');
        result.isValid = false;
      }
    }
  }

  // Rule 7: Night shift recovery check
  for (let i = 0; i < pattern.length - 1; i++) {
    if (pattern[i] === 'N' && pattern[i + 1] !== 'R' && pattern[i + 1] !== 'N') {
      result.warnings.push('Night shift should typically be followed by rest or another night shift');
    }
  }

  logger.info('Pattern validation complete', result);
  return result;
}

/**
 * Validates pattern name for uniqueness and format
 */
export function validatePatternName(name: string, existingNames: string[]): PatternValidationResult {
  const result: PatternValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!name || name.trim().length === 0) {
    result.errors.push('Pattern name is required');
    result.isValid = false;
    return result;
  }

  if (name.trim().length < 3) {
    result.errors.push('Pattern name must be at least 3 characters long');
    result.isValid = false;
  }

  if (name.trim().length > 50) {
    result.errors.push('Pattern name must be less than 50 characters');
    result.isValid = false;
  }

  if (existingNames.includes(name.trim())) {
    result.errors.push('Pattern name already exists');
    result.isValid = false;
  }

  return result;
}
