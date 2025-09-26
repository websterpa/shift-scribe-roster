import { nightExpectations, validateRosterResults } from "@/utils/roster/validateConfig";

describe("nightExpectations", () => {
  test("expects nights if 12h system", () => {
    const result = nightExpectations({ 
      system: "12h", 
      requiredByDay: {}, 
      includeNights: false 
    });
    expect(result.expectsNights).toBe(true);
  });

  test("expects nights if N demand exists", () => {
    const result = nightExpectations({ 
      system: "8h", 
      requiredByDay: { 0: { N: 1 } }, 
      includeNights: false 
    });
    expect(result.expectsNights).toBe(true);
  });

  test("expects nights if includeNights is true", () => {
    const result = nightExpectations({ 
      system: "8h", 
      requiredByDay: {}, 
      includeNights: true 
    });
    expect(result.expectsNights).toBe(true);
  });

  test("does not expect nights for 8h without flags", () => {
    const result = nightExpectations({ 
      system: "8h", 
      requiredByDay: {}, 
      includeNights: false 
    });
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