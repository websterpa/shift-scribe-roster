import { expandShift } from "../../engine2/time/expandShift";
import type { ShiftSpec, Holiday } from "../../engine2/types";

function d(str: string) { return new Date(str); } // ISO local assumed

describe("expandShift - nights", () => {
  it("splits across midnight and tags NIGHT correctly", () => {
    const shift: ShiftSpec = { start: d("2025-01-10T22:00:00"), end: d("2025-01-11T06:00:00") };
    const segs = expandShift(shift, { nightStartHour: 22, nightEndHour: 6 });
    expect(segs.length).toBeGreaterThan(1);
    const hours = segs.reduce((acc, s) => acc + (s.end.getTime() - s.start.getTime()) / 3600000, 0);
    expect(hours).toBeCloseTo(8, 6);
    expect(segs.every(s => s.tags.includes("NIGHT"))).toBe(true);
  });

  it("tags WEEKEND when applicable", () => {
    const shift: ShiftSpec = { start: d("2025-01-11T22:00:00"), end: d("2025-01-12T06:00:00") }; // Sat->Sun
    const segs = expandShift(shift, {});
    expect(segs.some(s => s.tags.includes("WEEKEND"))).toBe(true);
  });

  it("tags PUBLIC_HOLIDAY when date matches", () => {
    const shift: ShiftSpec = { start: d("2025-12-25T00:00:00"), end: d("2025-12-25T08:00:00") };
    const holidays: Holiday[] = [{ dateISO: "2025-12-25", isPublicHoliday: true }];
    const segs = expandShift(shift, { holidays });
    expect(segs.some(s => s.tags.includes("PUBLIC_HOLIDAY"))).toBe(true);
  });

  it("randomized property: coverage is exact and segments non-overlapping", () => {
    for (let i = 0; i < 100; i++) {
      const startHour = Math.floor(Math.random() * 24);
      const durHrs = 4 + Math.floor(Math.random() * 16);
      const day = 10 + Math.floor(Math.random() * 10);
      const start = d(`2025-03-${String(day).padStart(2, "0")}T${String(startHour).padStart(2, "0")}:00:00`);
      const end = new Date(start.getTime() + durHrs * 3600000);
      const segs = expandShift({ start, end }, {});
      const total = segs.reduce((a, s) => a + (s.end.getTime() - s.start.getTime()), 0);
      expect(total).toBe(end.getTime() - start.getTime());
      for (let j = 0; j < segs.length - 1; j++) {
        expect(segs[j].end.getTime()).toBeLessThanOrEqual(segs[j + 1].start.getTime());
      }
    }
  });
});