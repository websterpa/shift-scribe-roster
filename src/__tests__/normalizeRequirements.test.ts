import { describe, test, expect } from 'vitest';
import { normalizeRequirements } from '@/utils/roster/normalizeRequirements';

describe('@nights normalizeRequirements', () => {
  test('preserves N token from modern format', () => {
    const input = [
      { dow: 0, need: { N: 2, D: 3 } },
      { dow: 1, need: { N: 2, D: 3 } }
    ];
    
    const result = normalizeRequirements(input);
    
    expect(result[0].N).toBe(2);
    expect(result[1].N).toBe(2);
  });

  test('maps "Night" label to N token', () => {
    const input = {
      0: { Night: 2, Day: 3 },
      1: { Night: 2, Day: 3 }
    };
    
    const result = normalizeRequirements(input);
    
    expect(result[0].N).toBe(2);
    expect(result[1].N).toBe(2);
  });

  test('maps night_shift_staff to N token', () => {
    const input = {
      0: { night_shift_staff: 2, day_shift_staff: 3 },
      1: { night_shift_staff: 2, day_shift_staff: 3 }
    };
    
    const result = normalizeRequirements(input);
    
    expect(result[0].N).toBe(2);
    expect(result[1].N).toBe(2);
  });

  test('handles 8h system with E/L/N', () => {
    const input = [
      { dow: 0, need: { E: 1, L: 1, N: 2 } },
      { dow: 1, need: { E: 1, L: 1, N: 2 } }
    ];
    
    const result = normalizeRequirements(input);
    
    expect(result[0].E).toBe(1);
    expect(result[0].L).toBe(1);
    expect(result[0].N).toBe(2);
  });

  test('handles 12h system with D/N', () => {
    const input = [
      { dow: 0, need: { D: 3, N: 2 } },
      { dow: 1, need: { D: 3, N: 2 } }
    ];
    
    const result = normalizeRequirements(input);
    
    expect(result[0].D).toBe(3);
    expect(result[0].N).toBe(2);
  });

  test('filters out zero and negative counts', () => {
    const input = [
      { dow: 0, need: { N: 2, D: 0, E: -1 } }
    ];
    
    const result = normalizeRequirements(input);
    
    expect(result[0].N).toBe(2);
    expect(result[0].D).toBeUndefined();
    expect(result[0].E).toBeUndefined();
  });

  test('returns empty object for invalid input', () => {
    expect(normalizeRequirements(null)).toEqual({});
    expect(normalizeRequirements(undefined)).toEqual({});
    expect(normalizeRequirements('invalid')).toEqual({});
    expect(normalizeRequirements(123)).toEqual({});
  });
});
