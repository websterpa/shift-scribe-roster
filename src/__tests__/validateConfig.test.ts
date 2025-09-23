import { assertNightExpectations, validateRosterResults } from "@/utils/roster/validateConfig";

describe("assertNightExpectations", () => {
  test("expects nights when shift system is 12h", () => {
    const result = assertNightExpectations({ shiftSystem: "12h" });
    expect(result.expectsNights).toBe(true);
  });

  test("expects nights when includeNights is true", () => {
    const result = assertNightExpectations({ 
      shiftSystem: "8h", 
      includeNights: true 
    });
    expect(result.expectsNights).toBe(true);
  });

  test("expects nights when N requirement exists", () => {
    const result = assertNightExpectations({ 
      requiredByShift: { D: 2, N: 1 }
    });
    expect(result.expectsNights).toBe(true);
  });

  test("does not expect nights for 8h system without flags", () => {
    const result = assertNightExpectations({ shiftSystem: "8h" });
    expect(result.expectsNights).toBe(false);
  });
});

describe("validateRosterResults", () => {
  test("passes validation when nights are present and expected", () => {
    const assignments = [
      { token: "D" },
      { token: "N" },
      { shift_code: "Night" }
    ];
    
    const result = validateRosterResults(
      { shiftSystem: "12h" }, 
      assignments
    );
    
    expect(result.validated).toBe(true);
  });

  test("throws error when nights expected but missing", () => {
    const assignments = [
      { token: "D" },
      { token: "R" }
    ];
    
    expect(() => {
      validateRosterResults({ shiftSystem: "12h" }, assignments);
    }).toThrow("Night-enabled configuration produced 0 Night assignments");
  });

  test("passes validation when nights not expected", () => {
    const assignments = [
      { token: "D" },
      { token: "R" }
    ];
    
    const result = validateRosterResults(
      { shiftSystem: "8h" }, 
      assignments
    );
    
    expect(result.validated).toBe(true);
  });
});