import { costShift } from "../../engine2/cost/costShift";
import { expandShift } from "../../engine2/time/expandShift";
import type { RatePolicy, ShiftSpec } from "../../engine2/types";

function d(s: string) { return new Date(s); }

const baseRates: RatePolicy = {
  baseHourly: 15,
  differentials: [{ tag: "NIGHT", percentage: 0.30 }],
  premiumMultipliers: [{ tag: "PUBLIC_HOLIDAY", multiplier: 2.0 }],
  stacking: { kind: "MAX_OF", components: ["DIFF", "MULTIPLIER"], includeFlat: true },
  allowances: [{ code: "MEAL", amount: 5 }]
};

describe("costShift", () => {
  it("applies flat + max of diff/multiplier", () => {
    const spec: ShiftSpec = {
      start: d("2025-12-25T22:00:00"),
      end: d("2025-12-26T06:00:00"),
      flatShiftPay: 20
    };
    const segs = expandShift(spec, { 
      holidays: [
        { dateISO: "2025-12-25", isPublicHoliday: true }, 
        { dateISO: "2025-12-26", isPublicHoliday: true }
      ] 
    });
    const res = costShift(spec, segs, baseRates);
    expect(res.base).toBeGreaterThan(0);
    expect(res.flatShiftPay).toBe(20);
    expect(res.allowances).toBe(5);
    // ensure either diff or multiplier contributes (max-of)
    expect(res.differential === 0 || res.premium === 0).toBe(true);
    expect(res.total).toBeCloseTo(res.base + res.differential + res.premium + res.flatShiftPay + res.allowances, 6);
  });

  it("handles SUM stacking policy", () => {
    const sumRates: RatePolicy = {
      ...baseRates,
      stacking: { kind: "SUM", includeFlat: true }
    };
    const spec: ShiftSpec = {
      start: d("2025-12-25T22:00:00"),
      end: d("2025-12-26T06:00:00"),
      flatShiftPay: 10
    };
    const segs = expandShift(spec, { 
      holidays: [{ dateISO: "2025-12-25", isPublicHoliday: true }] 
    });
    const res = costShift(spec, segs, sumRates);
    
    // With SUM policy, both differential and premium should apply
    expect(res.differential).toBeGreaterThan(0);
    expect(res.premium).toBeGreaterThan(0);
  });
});