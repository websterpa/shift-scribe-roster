import { expandShift } from "../../engine2/time/expandShift";
import type { ShiftSpec } from "../../engine2/types";

// Set timezone to ensure consistent DST behavior
process.env.TZ = "Europe/London";

function d(s: string) { return new Date(s); }
function totalHours(segs: { start: Date; end: Date }[]) {
  return segs.reduce((acc, s) => acc + (s.end.getTime() - s.start.getTime()), 0) / 3_600_000;
}

/** UK DST 2025: spring forward 2025-03-30; fall back 2025-10-26 */
describe("engine2: DST boundary coverage", () => {
  it("spring forward: 01:00–04:00 equals 2 real hours", () => {
    const spec: ShiftSpec = { start: d("2025-03-30T01:00:00"), end: d("2025-03-30T04:00:00") };
    const segs = expandShift(spec, { nightStartHour: 22, nightEndHour: 6 });
    expect(totalHours(segs)).toBeCloseTo(2, 6);
  });
  
  it("fall back: 01:00–04:00 equals 4 real hours", () => {
    const spec: ShiftSpec = { start: d("2025-10-26T01:00:00"), end: d("2025-10-26T04:00:00") };
    const segs = expandShift(spec, { nightStartHour: 22, nightEndHour: 6 });
    expect(totalHours(segs)).toBeCloseTo(4, 6);
  });

  it("normal day: coverage is exact", () => {
    const spec: ShiftSpec = { start: d("2025-06-15T22:00:00"), end: d("2025-06-16T06:00:00") };
    const segs = expandShift(spec, { nightStartHour: 22, nightEndHour: 6 });
    expect(totalHours(segs)).toBeCloseTo(8, 6);
    expect(segs.every(s => s.tags.includes("NIGHT"))).toBe(true);
  });
});