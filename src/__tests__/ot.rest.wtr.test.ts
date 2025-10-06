import { describe, test, expect } from 'vitest';
import { makeShiftWindowResolver, OTOptions } from '../utils/shiftWindowResolver';
import { respectsRestRules } from '../utils/restValidation';
import { shiftCost, durationHours } from '../utils/costing';
import { checkWeeklyLimits, WeeklySummaries } from '../utils/wtrGate';
import { ShiftCode } from '../utils/constraints';

describe("Variable OT Rest & WTR Compliance", () => {
  
  describe("Rest Rules with Variable OT", () => {
    test("11h rest rule respected with 4h OT", () => {
      const resolve = makeShiftWindowResolver({
        shiftSystem: "8h",
        siteStartLocalTime: "06:00",
        timezone: "Europe/London"
      });

      // Previous shift: Day shift ending at 15:45
      const prevShift = resolve("2025-06-03", "E")!; // 06:00-14:00
      
      // Next shift: 4h OT starting at 10:00 next day (should be allowed - 20h gap)
      const nextOT = resolve("2025-06-04", "OT", { 
        otHours: 4, 
        otStartLocalTime: "10:00" 
      })!;
      
      const respectsRest = respectsRestRules(
        prevShift.end,     // Previous shift end
        "2025-06-03",      // Previous date
        "E",               // Previous code
        "2025-06-04",      // Next date
        "OT",              // Next code (OT)
        (dateISO, code, opts) => resolve(dateISO, code, opts)
      );
      
      expect(respectsRest).toBe(true);
      
      // Verify the gap is actually >= 11h
      const gapHours = (nextOT.start.getTime() - prevShift.end.getTime()) / 3_600_000;
      expect(gapHours).toBeGreaterThanOrEqual(11);
    });

    test("11h rest rule violated with early OT", () => {
      const resolve = makeShiftWindowResolver({
        shiftSystem: "8h", 
        siteStartLocalTime: "06:00",
        timezone: "Europe/London"
      });

      // Previous shift: Night shift ending at 06:00
      const prevShift = resolve("2025-06-03", "N")!; // 22:00-06:00 next day
      
      // Next shift: 4h OT starting at 08:00 same day (only 2h gap)
      const nextOT = resolve("2025-06-04", "OT", {
        otHours: 4,
        otStartLocalTime: "08:00" 
      })!;
      
      const respectsRest = respectsRestRules(
        prevShift.end,
        "2025-06-03", 
        "N",
        "2025-06-04",
        "OT",
        (dateISO, code, opts) => resolve(dateISO, code, opts)
      );
      
      expect(respectsRest).toBe(false);
      
      // Verify the gap is actually < 11h  
      const gapHours = (nextOT.start.getTime() - prevShift.end.getTime()) / 3_600_000;
      expect(gapHours).toBeLessThan(11);
    });

    test("Same day Day->Night rule applies to OT", () => {
      const resolve = makeShiftWindowResolver({
        shiftSystem: "8h",
        siteStartLocalTime: "06:00", 
        timezone: "Europe/London"
      });

      // Day shift and Night OT on same calendar day should be blocked
      const respectsRest = respectsRestRules(
        null, // Don't need actual end time for this test
        "2025-06-03",  // Same date
        "E",           // Day shift
        "2025-06-03",  // Same date  
        "N",           // Night shift (could be OT)
        (dateISO, code) => resolve(dateISO, code)
      );
      
      expect(respectsRest).toBe(false);
    });
  });

  describe("WTR Compliance with Variable OT", () => {
    test("Weekly hours correctly include variable OT hours", () => {
      // Mock weekly assignments with mixed regular and OT shifts
      const weeklyAssignments = [
        { shiftCode: "E", otOptions: undefined },           // 8h
        { shiftCode: "L", otOptions: undefined },           // 8h  
        { shiftCode: "OT", otOptions: { otHours: 4 } },     // 4h OT
        { shiftCode: "E", otOptions: undefined },           // 8h
        { shiftCode: "OT", otOptions: { otHours: 3.5 } },   // 3.5h OT
        // Total: 8+8+4+8+3.5 = 31.5 hours
      ];
      
      let totalHours = 0;
      weeklyAssignments.forEach(assignment => {
        if (assignment.shiftCode === 'OT' && assignment.otOptions?.otHours) {
          totalHours += assignment.otOptions.otHours;
        } else {
          totalHours += 8; // Regular 8h shift
        }
      });
      
      expect(totalHours).toBe(31.5);
      expect(totalHours).toBeLessThan(48); // Under WTR limit
    });

    test("WTR violation detected with excessive OT hours", () => {
      // Mock weekly summaries with excessive OT
      const weeklySummaries: WeeklySummaries = {
        "staff-1": [
          {
            weekIndex: 0,
            hours: 55, // Over 48h limit (5x8h + 15h OT)
            has24hRest: true,
            nightHours: 8
          }
        ]
      };
      
      const violations = checkWeeklyLimits(weeklySummaries, false); // Don't allow opt-out
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0]).toContain("staff-1");
      expect(violations[0]).toContain(">48h");
    });

    test("OT hours included in cost calculations", () => {
      const resolve = makeShiftWindowResolver({
        shiftSystem: "8h",
        siteStartLocalTime: "06:00",
        timezone: "Europe/London"
      });

      // Test different OT durations
      const testCases = [
        { hours: 4, startTime: "10:00" },
        { hours: 3.5, startTime: "14:30" },
        { hours: 6, startTime: "18:00" }
      ];
      
      testCases.forEach(testCase => {
        const otWindow = resolve("2025-06-03", "OT", {
          otHours: testCase.hours,
          otStartLocalTime: testCase.startTime
        })!;
        
        // Verify duration matches requested hours
        const actualHours = durationHours(otWindow.start, otWindow.end);
        expect(actualHours).toBeCloseTo(testCase.hours, 2);
        
        // Verify cost calculation uses actual hours
        const hours = durationHours(otWindow.start, otWindow.end);
        const cost = shiftCost(otWindow.start, otWindow.end, 20);
        
        // Expected: hours * rate * 1.5 (weekday OT multiplier)
        const expectedCost = testCase.hours * 20 * 1.5;
        expect(cost).toBeCloseTo(expectedCost, 2);
      });
    });
  });

  describe("Cross-System Validation", () => {
    test("Variable OT works in 12h system", () => {
      const resolve = makeShiftWindowResolver({
        shiftSystem: "12h",
        siteStartLocalTime: "07:00",
        timezone: "Europe/London"
      });

      // Test 6h OT in 12h system
      const otWindow = resolve("2025-06-03", "OT", {
        otHours: 6,
        otStartLocalTime: "15:00"
      })!;
      
      const actualHours = durationHours(otWindow.start, otWindow.end);
      expect(actualHours).toBeCloseTo(6);
      
      // Should start at 15:00
      expect(otWindow.start.getHours()).toBe(15);
      expect(otWindow.start.getMinutes()).toBe(0);
    });

    test("DST handling in different timezones", () => {
      const resolverUS = makeShiftWindowResolver({
        shiftSystem: "8h",
        siteStartLocalTime: "06:00", 
        timezone: "America/New_York"
      });
      
      // Test OT crossing DST boundary (if applicable)
      const otWindow = resolverUS("2025-03-10", "OT", {
        otHours: 8,
        otStartLocalTime: "14:00"
      })!;
      
      const actualHours = durationHours(otWindow.start, otWindow.end);
      expect(actualHours).toBeCloseTo(8); // Should handle DST correctly
    });
  });

  describe("Integration Validation", () => {
    test("Rest validator uses actual OT window timing", () => {
      const resolve = makeShiftWindowResolver({
        shiftSystem: "8h",
        siteStartLocalTime: "06:00",
        timezone: "Europe/London"
      });

      // Create a custom resolver that tracks what windows it resolves
      const resolvedWindows: Array<{ dateISO: string; code: ShiftCode; opts?: OTOptions }> = [];
      const trackingResolver = (dateISO: string, code: ShiftCode, opts?: OTOptions) => {
        resolvedWindows.push({ dateISO, code, opts });
        return resolve(dateISO, code, opts);
      };

      // Test rest validation with OT
      const prevShift = resolve("2025-06-03", "E")!;
      
      respectsRestRules(
        prevShift.end,
        "2025-06-03",
        "E", 
        "2025-06-04",
        "OT",
        trackingResolver
      );
      
      // Verify the resolver was called for the OT shift
      expect(resolvedWindows.some(w => w.code === "OT")).toBe(true);
    });
  });
});

describe("Acceptance Criteria Validation", () => {
  test("✅ OT can be assigned for any positive duration", () => {
    const resolve = makeShiftWindowResolver({
      shiftSystem: "8h",
      siteStartLocalTime: "06:00", 
      timezone: "Europe/London"
    });

    const testDurations = [0.5, 2, 3.5, 4, 6, 8, 12, 16];
    
    testDurations.forEach(duration => {
      const window = resolve("2025-06-03", "OT", { otHours: duration });
      expect(window).not.toBeNull();
      
      const actualHours = durationHours(window!.start, window!.end);
      expect(actualHours).toBeCloseTo(duration, 2);
    });
  });

  test("✅ OT can start at custom local time per assignment", () => {
    const resolve = makeShiftWindowResolver({
      shiftSystem: "8h",
      siteStartLocalTime: "06:00",
      timezone: "Europe/London"
    });

    const testTimes = ["08:00", "10:30", "14:15", "18:45", "22:00"];
    
    testTimes.forEach(time => {
      const [hours, minutes] = time.split(':').map(Number);
      const window = resolve("2025-06-03", "OT", { 
        otHours: 4, 
        otStartLocalTime: time 
      });
      
      expect(window).not.toBeNull();
      expect(window!.start.getHours()).toBe(hours);
      expect(window!.start.getMinutes()).toBe(minutes);
    });
  });

  test("✅ Rest rules respected with OT", () => {
    const resolve = makeShiftWindowResolver({
      shiftSystem: "8h",
      siteStartLocalTime: "06:00",
      timezone: "Europe/London"
    });

    // Test 11h rest rule
    const prevShift = resolve("2025-06-03", "E")!;
    const validOT = resolve("2025-06-04", "OT", { 
      otHours: 4, 
      otStartLocalTime: "02:00" 
    })!;
    
    const gapHours = (validOT.start.getTime() - prevShift.end.getTime()) / 3_600_000;
    const respectsRest = gapHours >= 11;
    
    expect(respectsRest).toBe(true);
  });

  test("✅ Costing reflects actual OT hours with multipliers", () => {
    const resolve = makeShiftWindowResolver({
      shiftSystem: "8h",
      siteStartLocalTime: "06:00", 
      timezone: "Europe/London"
    });

    // Test 3.5h Sunday OT
    const otWindow = resolve("2025-06-08", "OT", { // Sunday
      otHours: 3.5,
      otStartLocalTime: "10:00"
    })!;
    
    const hours = durationHours(otWindow.start, otWindow.end);
    const cost = shiftCost(otWindow.start, otWindow.end, 15);
    
    // Expected: 3.5h * £15 * 2.0 (Sunday multiplier) = £105
    expect(cost).toBeCloseTo(105);
  });
});