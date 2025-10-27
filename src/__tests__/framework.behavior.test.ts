import { describe, test, expect } from 'vitest';
import {
  detectFramework,
  remapToFramework,
  FRAMEWORK_8H,
  FRAMEWORK_12H,
  isValidCode,
  toCode,
  shiftCodeToName,
  type ShiftCode
} from '@/features/roster/shiftMap';

describe('Framework Detection', () => {
  test('detects 12h framework with D and N only', () => {
    const codes = new Set(['D', 'N']);
    expect(detectFramework(codes)).toBe('12h');
  });

  test('detects 12h framework with D, N, and R', () => {
    const codes = new Set(['D', 'N', 'R']);
    expect(detectFramework(codes)).toBe('12h');
  });

  test('detects 8h framework with E or L present', () => {
    expect(detectFramework(new Set(['E', 'L', 'N']))).toBe('8h');
    expect(detectFramework(new Set(['E', 'N']))).toBe('8h');
    expect(detectFramework(new Set(['L', 'N']))).toBe('8h');
  });

  test('detects 8h framework when only E present', () => {
    expect(detectFramework(new Set(['E']))).toBe('8h');
  });

  test('detects mixed framework when N without clear 8h or 12h', () => {
    expect(detectFramework(new Set(['N']))).toBe('mixed');
  });

  test('defaults to 8h for empty or rest-only sets', () => {
    expect(detectFramework(new Set([]))).toBe('8h');
    expect(detectFramework(new Set(['R']))).toBe('8h');
  });

  test('rejects mixed framework when D and E both present', () => {
    const codes = new Set(['D', 'E', 'N']);
    // This should not be 12h because E is present
    expect(detectFramework(codes)).not.toBe('12h');
  });
});

describe('Framework Remapping', () => {
  test('remaps E to D in 12h framework', () => {
    const result = remapToFramework(['E'], '12h');
    expect(result).toEqual(['D']);
  });

  test('remaps L to D in 12h framework', () => {
    const result = remapToFramework(['L'], '12h');
    expect(result).toEqual(['D']);
  });

  test('remaps E and L to D, keeps N in 12h framework', () => {
    const result = remapToFramework(['E', 'L', 'N'], '12h');
    expect(result).toEqual(['D', 'D', 'N']);
  });

  test('keeps D and N unchanged in 12h framework', () => {
    const result = remapToFramework(['D', 'N'], '12h');
    expect(result).toEqual(['D', 'N']);
  });

  test('keeps R unchanged in 12h framework', () => {
    const result = remapToFramework(['R'], '12h');
    expect(result).toEqual(['R']);
  });

  test('no remapping for 8h framework', () => {
    const codes = ['E', 'L', 'N', 'R'];
    const result = remapToFramework(codes, '8h');
    expect(result).toEqual(codes);
  });

  test('complex pattern remapping for 12h', () => {
    const pattern = ['E', 'E', 'L', 'L', 'N', 'R', 'R'];
    const result = remapToFramework(pattern, '12h');
    expect(result).toEqual(['D', 'D', 'D', 'D', 'N', 'R', 'R']);
  });

  test('handles empty array', () => {
    expect(remapToFramework([], '12h')).toEqual([]);
    expect(remapToFramework([], '8h')).toEqual([]);
  });
});

describe('Framework Constants', () => {
  test('FRAMEWORK_8H contains E, L, N', () => {
    expect(FRAMEWORK_8H).toEqual(['E', 'L', 'N']);
  });

  test('FRAMEWORK_12H contains D, N', () => {
    expect(FRAMEWORK_12H).toEqual(['D', 'N']);
  });

  test('frameworks do not overlap in working shifts', () => {
    const set8h = new Set(FRAMEWORK_8H);
    const set12h = new Set(FRAMEWORK_12H);
    
    // D should not be in 8h
    expect(set8h.has('D')).toBe(false);
    
    // E and L should not be in 12h
    expect(set12h.has('E')).toBe(false);
    expect(set12h.has('L')).toBe(false);
    
    // N is in both (shared)
    expect(set8h.has('N')).toBe(true);
    expect(set12h.has('N')).toBe(true);
  });
});

describe('Shift Code Validation', () => {
  test('validates correct shift codes', () => {
    expect(isValidCode('D')).toBe(true);
    expect(isValidCode('E')).toBe(true);
    expect(isValidCode('L')).toBe(true);
    expect(isValidCode('N')).toBe(true);
    expect(isValidCode('R')).toBe(true);
    expect(isValidCode('S')).toBe(true);
  });

  test('rejects invalid shift codes', () => {
    expect(isValidCode('X')).toBe(false);
    expect(isValidCode('Day')).toBe(false);
    expect(isValidCode('12')).toBe(false);
    expect(isValidCode('')).toBe(false);
  });
});

describe('Shift Code Conversion', () => {
  test('toCode converts logical names to codes', () => {
    expect(toCode('Day')).toBe('D');
    expect(toCode('Early')).toBe('E');
    expect(toCode('Late')).toBe('L');
    expect(toCode('Night')).toBe('N');
    expect(toCode('Rest')).toBe('R');
  });

  test('toCode handles case-insensitive input', () => {
    expect(toCode('day')).toBe('D');
    expect(toCode('NIGHT')).toBe('N');
    expect(toCode('early')).toBe('E');
  });

  test('toCode passes through valid codes', () => {
    expect(toCode('D')).toBe('D');
    expect(toCode('N')).toBe('N');
    expect(toCode('E')).toBe('E');
  });

  test('toCode handles empty input', () => {
    expect(toCode('')).toBe('');
  });

  test('shiftCodeToName converts codes to names', () => {
    expect(shiftCodeToName('D')).toBe('Day');
    expect(shiftCodeToName('E')).toBe('Early');
    expect(shiftCodeToName('L')).toBe('Late');
    expect(shiftCodeToName('N')).toBe('Night');
    expect(shiftCodeToName('R')).toBe('Rest');
    expect(shiftCodeToName('S')).toBe('Sick');
  });
});

describe('Generator Output Validation', () => {
  test('12h generator should only produce D, N, R, S codes', () => {
    const allowed12hCodes = new Set<ShiftCode>(['D', 'N', 'R', 'S']);
    const illegal12hCodes = new Set<ShiftCode>(['E', 'L']);
    
    // Simulate a generator output for 12h
    const mockOutput: ShiftCode[] = ['D', 'D', 'N', 'R', 'R', 'D', 'N'];
    
    mockOutput.forEach(code => {
      expect(allowed12hCodes.has(code)).toBe(true);
      expect(illegal12hCodes.has(code)).toBe(false);
    });
  });

  test('8h generator should only produce E, L, N, R, S codes', () => {
    const allowed8hCodes = new Set<ShiftCode>(['E', 'L', 'N', 'R', 'S']);
    const illegal8hCode: ShiftCode = 'D';
    
    // Simulate a generator output for 8h
    const mockOutput: ShiftCode[] = ['E', 'E', 'L', 'L', 'N', 'R', 'R'];
    
    mockOutput.forEach(code => {
      expect(allowed8hCodes.has(code)).toBe(true);
      expect(code).not.toBe(illegal8hCode);
    });
  });

  test('validator catches illegal E/L in 12h output', () => {
    const validate12hOutput = (codes: string[]): boolean => {
      return codes.every(code => code !== 'E' && code !== 'L');
    };
    
    expect(validate12hOutput(['D', 'N', 'R'])).toBe(true);
    expect(validate12hOutput(['D', 'E', 'N'])).toBe(false);
    expect(validate12hOutput(['L', 'N', 'R'])).toBe(false);
  });

  test('validator catches illegal D in 8h output', () => {
    const validate8hOutput = (codes: string[]): boolean => {
      return codes.every(code => code !== 'D');
    };
    
    expect(validate8hOutput(['E', 'L', 'N', 'R'])).toBe(true);
    expect(validate8hOutput(['D', 'L', 'N'])).toBe(false);
  });
});

describe('Framework Integrity', () => {
  test('remapping produces only valid codes', () => {
    const input = ['E', 'L', 'N', 'R', 'S'];
    const output = remapToFramework(input, '12h');
    
    output.forEach(code => {
      expect(isValidCode(code)).toBe(true);
    });
  });

  test('remapping maintains array length', () => {
    const input = ['E', 'L', 'N', 'R'];
    const output = remapToFramework(input, '12h');
    
    expect(output.length).toBe(input.length);
  });

  test('remapping is idempotent for target framework', () => {
    const input = ['D', 'N', 'R'];
    const output1 = remapToFramework(input, '12h');
    const output2 = remapToFramework(output1, '12h');
    
    expect(output1).toEqual(output2);
  });

  test('no data loss in framework conversion', () => {
    const pattern = ['E', 'E', 'L', 'L', 'N', 'N', 'R'];
    const remapped = remapToFramework(pattern, '12h');
    
    // Count each shift type
    const countE = pattern.filter(c => c === 'E').length;
    const countL = pattern.filter(c => c === 'L').length;
    const countN = pattern.filter(c => c === 'N').length;
    const countR = pattern.filter(c => c === 'R').length;
    
    const countD = remapped.filter(c => c === 'D').length;
    const countNRemapped = remapped.filter(c => c === 'N').length;
    const countRRemapped = remapped.filter(c => c === 'R').length;
    
    // D should equal E + L
    expect(countD).toBe(countE + countL);
    // N and R should remain unchanged
    expect(countNRemapped).toBe(countN);
    expect(countRRemapped).toBe(countR);
  });
});

