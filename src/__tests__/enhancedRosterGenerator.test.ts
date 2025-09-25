import { generateRosterEnhanced } from "@/utils/roster/enhancedRosterGenerator";
import { StaffMember } from "@/types/roster";

const createStaff = (overrides: Partial<StaffMember> = {}): StaffMember => ({
  id: "staff-1",
  employee_id: "EMP001", 
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
  role: "Staff",
  hire_date: "2023-01-01",
  is_active: true,
  availability_status: "active",
  is_shift_worker: true,
  eligible_shifts: ["D", "N"],
  min_hours_per_week: 37,
  max_hours_per_week: 48,
  opted_out_wtd: false,
  days_off_per_week: 2,
  hourly_rate: 18,
  holiday_multiplier: 1.5,
  leave_allowance_days: 28,
  ...overrides
});

describe("generateRosterEnhanced", () => {
  test("generates night assignments first for 12h system", () => {
    const staff = [createStaff({ id: "s1" }), createStaff({ id: "s2" })];
    const requirementsByDay = {
      0: { D: 1, N: 1 }, // Day 0: 1 Day, 1 Night
      1: { D: 1, N: 1 }  // Day 1: 1 Day, 1 Night
    };

    const result = generateRosterEnhanced({
      system: "12h",
      versionId: "test-version",
      staff,
      requirementsByDay,
      startDate: "2024-01-01"
    });

    expect(result.assignments).toHaveLength(4); // 2 days * 2 shifts
    expect(result.nightsGenerated).toBe(2);
    
    // Check that nights were generated
    const nightShifts = result.assignments.filter(a => a.shift_code === "Night");
    expect(nightShifts).toHaveLength(2);
  });

  test("generates E/L/N assignments for 8h system", () => {
    const staff = [createStaff({ id: "s1" }), createStaff({ id: "s2" }), createStaff({ id: "s3" })];
    const requirementsByDay = {
      0: { E: 1, L: 1, N: 1 }
    };

    const result = generateRosterEnhanced({
      system: "8h",
      versionId: "test-version",
      staff,
      requirementsByDay,
      startDate: "2024-01-01",
      includeNights: true
    });

    expect(result.assignments).toHaveLength(3);
    expect(result.nightsGenerated).toBe(1);
    
    const shiftCodes = result.assignments.map(a => a.shift_code).sort();
    expect(shiftCodes).toEqual(["Early", "Late", "Night"]);
  });

  test("throws error when no eligible staff for nights", () => {
    const supervisor = createStaff({ role: "Supervisor" });
    const requirementsByDay = { 0: { N: 1 } };

    expect(() => {
      generateRosterEnhanced({
        system: "12h",
        versionId: "test-version",
        staff: [supervisor],
        requirementsByDay,
        startDate: "2024-01-01",
        allowSupervisorNights: false
      });
    }).toThrow(/Night readiness check failed/);
  });

  test("passes night readiness when supervisor nights allowed", () => {
    const supervisor = createStaff({ role: "Supervisor" });
    const requirementsByDay = { 0: { N: 1 } };

    const result = generateRosterEnhanced({
      system: "12h",
      versionId: "test-version", 
      staff: [supervisor],
      requirementsByDay,
      startDate: "2024-01-01",
      allowSupervisorNights: true
    });

    expect(result.nightsGenerated).toBe(1);
  });

  test("throws hard assertion when nights expected but not generated", () => {
    const dayOnlyStaff = createStaff({ eligible_shifts: ["D"] });
    const requirementsByDay = { 0: { N: 1 } };

    expect(() => {
      generateRosterEnhanced({
        system: "12h",
        versionId: "test-version",
        staff: [dayOnlyStaff],
        requirementsByDay,
        startDate: "2024-01-01"
      });
    }).toThrow(/Night-enabled configuration produced 0 Night assignments/);
  });
});