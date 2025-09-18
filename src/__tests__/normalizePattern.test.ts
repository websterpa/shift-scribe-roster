import { describe, it, expect } from "vitest";
import { normalizePatternSequence, PatternToken } from "@/utils/normalizePattern";

describe("normalizePatternSequence", () => {
  it("handles array input correctly", () => {
    const input: PatternToken[] = ["D", "D", "R", "R", "N", "N"];
    const result = normalizePatternSequence(input);
    expect(result).toEqual(["D", "D", "R", "R", "N", "N"]);
  });

  it("filters out invalid tokens from array", () => {
    const input = ["D", "X", "R", "Y", "N"] as any;
    const result = normalizePatternSequence(input);
    expect(result).toEqual(["D", "R", "N"]);
  });

  it("handles string input correctly", () => {
    const input = "DDRRNN";
    const result = normalizePatternSequence(input);
    expect(result).toEqual(["D", "D", "R", "R", "N", "N"]);
  });

  it("filters invalid characters from string", () => {
    const input = "DXRYNN";
    const result = normalizePatternSequence(input);
    expect(result).toEqual(["D", "R", "N", "N"]);
  });

  it("handles object with sequence array", () => {
    const input = { sequence: ["D", "D", "R", "R"] as PatternToken[] };
    const result = normalizePatternSequence(input);
    expect(result).toEqual(["D", "D", "R", "R"]);
  });

  it("handles object with sequence string", () => {
    const input = { sequence: "DDRR" };
    const result = normalizePatternSequence(input);
    expect(result).toEqual(["D", "D", "R", "R"]);
  });

  it("handles object with invalid sequence", () => {
    const input = { sequence: null };
    const result = normalizePatternSequence(input);
    expect(result).toEqual([]);
  });

  it("handles null input", () => {
    const result = normalizePatternSequence(null);
    expect(result).toEqual([]);
  });

  it("handles undefined input", () => {
    const result = normalizePatternSequence(undefined);
    expect(result).toEqual([]);
  });

  it("handles empty array", () => {
    const result = normalizePatternSequence([]);
    expect(result).toEqual([]);
  });

  it("handles empty string", () => {
    const result = normalizePatternSequence("");
    expect(result).toEqual([]);
  });

  it("handles object without sequence property", () => {
    const input = { other: "value" } as any;
    const result = normalizePatternSequence(input);
    expect(result).toEqual([]);
  });

  it("includes all valid tokens", () => {
    const input = "ELNDRELND";
    const result = normalizePatternSequence(input);
    expect(result).toEqual(["E", "L", "N", "D", "R", "E", "L", "N", "D"]);
  });
});