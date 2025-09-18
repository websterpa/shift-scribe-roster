import { describe, it, expect } from "vitest";
import { normalizePatternSequence } from "@/utils/normalizePattern";

describe("normalizePatternSequence", () => {
  it("accepts array tokens", () => {
    expect(normalizePatternSequence(["D","D","N","R"])).toEqual(["D","D","N","R"]);
  });
  it("accepts string and splits into tokens", () => {
    expect(normalizePatternSequence("DDNR")).toEqual(["D","D","N","R"]);
  });
  it("accepts object with sequence array", () => {
    expect(normalizePatternSequence({ sequence: ["E","L","N","R"] })).toEqual(["E","L","N","R"]);
  });
  it("accepts object with sequence string", () => {
    expect(normalizePatternSequence({ sequence: "ELNR" })).toEqual(["E","L","N","R"]);
  });
  it("drops invalid tokens and handles empty/undefined", () => {
    expect(normalizePatternSequence("XYZ")).toEqual([]);
    expect(normalizePatternSequence(undefined)).toEqual([]);
  });
});