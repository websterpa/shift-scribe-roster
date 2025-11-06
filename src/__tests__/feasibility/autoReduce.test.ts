import { describe, it, expect } from 'vitest';
import { optimiseHeadcount } from '@/services/feasibility/calculateFeasibility';

describe('optimiseHeadcount', () => {
  it('reduces headcount when slack ≥ 1 FTE and constraints pass', () => {
    const result = optimiseHeadcount({
      requiredHrs: 336,
      contractHrs: 37.5,
      bufferPct: 10,
      baseRequiredStaff: 10,
      passesWtd: () => true
    });

    // 10 staff = 375h available, 336h required → slack = 39h > 37.5h (1 FTE)
    // Should reduce to 9: 9 * 37.5 = 337.5h ≥ 336h ✓
    expect(result).toBe(9);
  });

  it('does not reduce below coverage requirement', () => {
    const result = optimiseHeadcount({
      requiredHrs: 360,
      contractHrs: 37.5,
      bufferPct: 10,
      baseRequiredStaff: 10,
      passesWtd: () => true
    });

    // 10 staff = 375h, 360h required → slack = 15h < 37.5h (1 FTE)
    // Should not reduce (slack too small)
    expect(result).toBe(10);
  });

  it('respects crew multiple constraint', () => {
    const result = optimiseHeadcount({
      requiredHrs: 300,
      contractHrs: 37.5,
      bufferPct: 10,
      baseRequiredStaff: 12,
      minMultiple: 4,
      passesWtd: () => true
    });

    // 12 staff (multiple of 4) = 450h, 300h required → slack = 150h
    // Can reduce to 8 (next multiple): 8 * 37.5 = 300h ≥ 300h ✓
    expect(result).toBe(8);
  });

  it('does not reduce below minimum multiple', () => {
    const result = optimiseHeadcount({
      requiredHrs: 140,
      contractHrs: 37.5,
      bufferPct: 10,
      baseRequiredStaff: 4,
      minMultiple: 4,
      passesWtd: () => true
    });

    // 4 is the minimum multiple, cannot reduce below it
    expect(result).toBe(4);
  });

  it('stops reducing when WTD fails', () => {
    let attempts = 0;
    const result = optimiseHeadcount({
      requiredHrs: 300,
      contractHrs: 37.5,
      bufferPct: 10,
      baseRequiredStaff: 10,
      passesWtd: (n) => {
        attempts++;
        return n >= 9; // WTD fails at 8 or below
      }
    });

    // Should try 9, pass WTD, then try 8, fail WTD, stop at 9
    expect(result).toBe(9);
    expect(attempts).toBeGreaterThan(0);
  });

  it('does not reduce when slack is less than 1 FTE', () => {
    const result = optimiseHeadcount({
      requiredHrs: 356,
      contractHrs: 37.5,
      bufferPct: 10,
      baseRequiredStaff: 10,
      passesWtd: () => true
    });

    // 10 staff = 375h, 356h required → slack = 19h < 37.5h (1 FTE)
    // Should not reduce
    expect(result).toBe(10);
  });

  it('handles multiple reduction steps correctly', () => {
    const result = optimiseHeadcount({
      requiredHrs: 280,
      contractHrs: 37.5,
      bufferPct: 10,
      baseRequiredStaff: 12,
      passesWtd: () => true
    });

    // 12 staff = 450h, 280h required → can reduce multiple times
    // 11: 412.5h ≥ 280h ✓, slack = 132.5h
    // 10: 375h ≥ 280h ✓, slack = 95h
    // 9: 337.5h ≥ 280h ✓, slack = 57.5h
    // 8: 300h ≥ 280h ✓, slack = 20h < 37.5h → stop at 8
    expect(result).toBe(8);
  });

  it('works with crew multiple and multiple reduction steps', () => {
    const result = optimiseHeadcount({
      requiredHrs: 200,
      contractHrs: 37.5,
      bufferPct: 10,
      baseRequiredStaff: 12,
      minMultiple: 4,
      passesWtd: () => true
    });

    // 12 (multiple of 4) = 450h, 200h required
    // Try 11 → not multiple, jump to 8
    // 8 * 37.5 = 300h ≥ 200h ✓
    // Try 7 → not multiple, jump to 4
    // 4 * 37.5 = 150h < 200h ✗ → stop at 8
    expect(result).toBe(8);
  });

  it('returns base when base is already at minimum multiple', () => {
    const result = optimiseHeadcount({
      requiredHrs: 150,
      contractHrs: 37.5,
      bufferPct: 10,
      baseRequiredStaff: 4,
      minMultiple: 4,
      passesWtd: () => true
    });

    expect(result).toBe(4);
  });

  it('handles zero base staff', () => {
    const result = optimiseHeadcount({
      requiredHrs: 0,
      contractHrs: 37.5,
      bufferPct: 10,
      baseRequiredStaff: 0,
      passesWtd: () => true
    });

    expect(result).toBe(0);
  });
});
