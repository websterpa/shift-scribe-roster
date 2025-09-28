import { describe, it, expect } from 'vitest';
import { normalizeToToken, assertShiftToken, mapShiftCodeToToken, LABEL_FROM_TOKEN } from '@/domain/shifts';

describe('shift token mapping & guard', () => {
  it('maps common labels to tokens', () => {
    expect(normalizeToToken('Day')).toBe('D');
    expect(normalizeToToken('Night')).toBe('N');
    expect(normalizeToToken('Early')).toBe('E');
    expect(normalizeToToken('Late')).toBe('L');
    expect(normalizeToToken('Rest')).toBe('R');
    expect(normalizeToToken('S')).toBe('S');
    expect(normalizeToToken('Sick')).toBe('S');
    expect(normalizeToToken('AL')).toBe('R'); // Leave codes map to Rest
    expect(normalizeToToken('SP')).toBe('R');
    expect(normalizeToToken('CL')).toBe('R');
  });

  it('guards invalid tokens', () => {
    expect(() => assertShiftToken('Night' as any)).toThrow(/Invalid shift_code/);
    expect(() => assertShiftToken('X' as any)).toThrow(/Invalid shift_code/);
    expect(() => assertShiftToken('N')).not.toThrow();
    expect(() => assertShiftToken('D')).not.toThrow();
    expect(() => assertShiftToken('E')).not.toThrow();
    expect(() => assertShiftToken('L')).not.toThrow();
    expect(() => assertShiftToken('R')).not.toThrow();
    expect(() => assertShiftToken('S')).not.toThrow();
  });

  it('maps shift codes to tokens safely', () => {
    expect(mapShiftCodeToToken('Night')).toBe('N');
    expect(mapShiftCodeToToken('Day')).toBe('D');
    expect(mapShiftCodeToToken('Early')).toBe('E');
    expect(mapShiftCodeToToken('Late')).toBe('L');
    expect(mapShiftCodeToToken('Rest')).toBe('R');
    expect(mapShiftCodeToToken('Sick')).toBe('S');
  });

  it('provides correct labels for display', () => {
    expect(LABEL_FROM_TOKEN.N).toBe('Night');
    expect(LABEL_FROM_TOKEN.D).toBe('Day');
    expect(LABEL_FROM_TOKEN.E).toBe('Early');
    expect(LABEL_FROM_TOKEN.L).toBe('Late');
    expect(LABEL_FROM_TOKEN.R).toBe('Rest');
    expect(LABEL_FROM_TOKEN.S).toBe('Sickness');
  });
});