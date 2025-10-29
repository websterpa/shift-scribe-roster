import { normalizeShiftCode } from "@/services/roster/helpers/normalizeShift";

test("normalizes readable DB names to tokens", () => {
  expect(normalizeShiftCode("Day")).toBe("D");
  expect(normalizeShiftCode("Night")).toBe("N");
  expect(normalizeShiftCode("Early")).toBe("E");
  expect(normalizeShiftCode("Late")).toBe("L");
  expect(normalizeShiftCode("Rest")).toBe("R");
});

test("handles abbreviations and variants", () => {
  expect(normalizeShiftCode("D")).toBe("D");
  expect(normalizeShiftCode("N")).toBe("N");
  expect(normalizeShiftCode("DAY")).toBe("D");
  expect(normalizeShiftCode("NIGHT")).toBe("N");
  expect(normalizeShiftCode("Off")).toBe("R");
  expect(normalizeShiftCode("OFF")).toBe("R");
});

test("handles null/undefined/empty input", () => {
  expect(normalizeShiftCode(null)).toBe("R");
  expect(normalizeShiftCode(undefined)).toBe("R");
  expect(normalizeShiftCode("")).toBe("R");
});

test("falls back to R for unknown inputs", () => {
  expect(normalizeShiftCode("Unknown")).toBe("R");
  expect(normalizeShiftCode("XYZ")).toBe("R");
});