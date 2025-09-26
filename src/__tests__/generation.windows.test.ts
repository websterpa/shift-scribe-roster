import { resolveShiftWindow } from "@/utils/roster/shiftWindows";

describe("resolveShiftWindow", () => {
  test("Night anchors overnight from site start", () => {
    const w = resolveShiftWindow("N", 6);
    expect(w.overnight).toBe(true);
    expect(w.start.startsWith("22:")).toBe(true); // 6+16=22
    expect(w.end.startsWith("06:")).toBe(true);
  });

  test("Day shift for 12h system", () => {
    const w = resolveShiftWindow("D", 6);
    expect(w.overnight).toBe(false);
    expect(w.start).toBe("06:00"); // site start
    expect(w.end).toBe("18:00"); // site start + 12
  });

  test("Early shift for 8h system", () => {
    const w = resolveShiftWindow("E", 7);
    expect(w.overnight).toBe(false);
    expect(w.start).toBe("07:00"); // site start
    expect(w.end).toBe("15:00"); // site start + 8
  });

  test("Late shift for 8h system", () => {
    const w = resolveShiftWindow("L", 7);
    expect(w.overnight).toBe(false);
    expect(w.start).toBe("15:00"); // site start + 8
    expect(w.end).toBe("23:00"); // site start + 16
  });

  test("handles midnight crossing for site start", () => {
    const w = resolveShiftWindow("D", 18); // 6pm start
    expect(w.start).toBe("18:00");
    expect(w.end).toBe("06:00"); // (18+12)%24 = 6
  });

  test("throws error for unknown token", () => {
    expect(() => {
      resolveShiftWindow("X" as any, 6);
    }).toThrow("Unknown token X");
  });
});