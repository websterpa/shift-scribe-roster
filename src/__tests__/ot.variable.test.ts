import { makeShiftWindowResolver } from "../utils/shiftWindowResolver";
import { durationHours } from "../utils/costing";

describe("Variable-length OT windows", () => {
  test("4h OT at custom local time 10:00 in 8h system", () => {
    const resolve = makeShiftWindowResolver({
      shiftSystem: "8h",
      siteStartLocalTime: "06:00",
      timezone: "Europe/London",
      defaultOtHours: 4
    });

    const win = resolve("2025-06-03", "OT", { otHours: 4, otStartLocalTime: "10:00" })!;
    expect(durationHours(win.start, win.end)).toBeCloseTo(4);
    // Start time sanity (local conversion is handled inside resolver; we just check duration > 0)
    expect(win.end.getTime()).toBeGreaterThan(win.start.getTime());
  });

  test("Fallback to default OT hours when not provided", () => {
    const resolve = makeShiftWindowResolver({
      shiftSystem: "12h",
      siteStartLocalTime: "07:00",
      timezone: "Europe/London",
      defaultOtHours: 5.5
    });

    const win = resolve("2025-06-04", "OT")!;
    expect(durationHours(win.start, win.end)).toBeCloseTo(5.5);
  });

  test("Fallback to system duration when no defaults", () => {
    const resolve8 = makeShiftWindowResolver({
      shiftSystem: "8h",
      siteStartLocalTime: "06:00",
      timezone: "Europe/London"
    });
    const win8 = resolve8("2025-06-05", "OT")!;
    expect(durationHours(win8.start, win8.end)).toBeCloseTo(8);

    const resolve12 = makeShiftWindowResolver({
      shiftSystem: "12h",
      siteStartLocalTime: "07:00",
      timezone: "Europe/London"
    });
    const win12 = resolve12("2025-06-05", "OT")!;
    expect(durationHours(win12.start, win12.end)).toBeCloseTo(12);
  });
});