import { generateRosterEnhanced, GeneratorInput } from "@/utils/roster/enhancedRosterGenerator";
import { StaffMember } from "@/types/roster";

describe("generateRosterEnhanced - 12h Nights", () => {
  const mockStaff: StaffMember[] = [
    {
      id: "staff1",
      first_name: "John",
      last_name: "Doe", 
      employee_id: "E001",
      email: "john@test.com",
      phone: "123-456-7890",
      hire_date: "2024-01-01",
      is_active: true,
      availability_status: "active",
      role: "CCTV Operator",
      min_hours_per_week: 32,
      max_hours_per_week: 48,
      opted_out_wtd: false,
      days_off_per_week: 2,
      hourly_rate: 15.50,
      holiday_multiplier: 2,
      leave_allowance_days: 28,
      eligible_shifts: ["Day", "Night"],
      is_shift_worker: true
    },
    {
      id: "staff2", 
      first_name: "Jane",
      last_name: "Smith",
      employee_id: "E002", 
      email: "jane@test.com",
      phone: "123-456-7891",
      hire_date: "2024-01-01",
      is_active: true,
      availability_status: "active",
      role: "CCTV Operator",
      min_hours_per_week: 32,
      max_hours_per_week: 48,
      opted_out_wtd: false,
      days_off_per_week: 2,
      hourly_rate: 15.50, 
      holiday_multiplier: 2,
      leave_allowance_days: 28,
      eligible_shifts: ["Day", "Night"],
      is_shift_worker: true
    },
    {
      id: "staff3",
      first_name: "Bob",
      last_name: "Wilson", 
      employee_id: "E003",
      email: "bob@test.com",
      phone: "123-456-7892",
      hire_date: "2024-01-01",
      is_active: true,
      availability_status: "active",
      role: "supervisor",
      min_hours_per_week: 40,
      max_hours_per_week: 48,
      opted_out_wtd: false,
      days_off_per_week: 2,
      hourly_rate: 22.00,
      holiday_multiplier: 2,
      leave_allowance_days: 28,
      eligible_shifts: ["Day", "Night"],
      is_shift_worker: true
    }
  ];

  test("12h: 2D2N demand produces N > 0", () => {
    const req: Record<number, Record<string, number>> = {
      0: { D: 2, N: 2 }, // Day 0: 2 Day, 2 Night
      1: { D: 2, N: 1 }, // Day 1: 2 Day, 1 Night  
      2: { D: 1, N: 2 }  // Day 2: 1 Day, 2 Night
    };

    const input: GeneratorInput = {
      versionId: "test-version-1",
      system: "12h",
      siteStartHH: 6,
      allowSupervisorNights: false, // Supervisors not allowed for nights
      staff: mockStaff,
      requirementsByDay: req,
      startDate: "2025-09-10",
      includeNights: true
    };

    const result = generateRosterEnhanced(input);

    expect(result.assignments.length).toBeGreaterThan(0);
    expect(result.nightsGenerated).toBeGreaterThan(0);
    
    // Verify we have Night assignments (now using token 'N')
    const nightAssignments = result.assignments.filter(a => a.shift_code === "N");
    expect(nightAssignments.length).toBe(5); // 2+1+2 = 5 total Night assignments expected

    // Verify Night assignments are anchored to start day
    nightAssignments.forEach(assignment => {
      expect(assignment.date).toMatch(/^2025-09-1[0-2]$/); // Should be within our date range
      expect(assignment.shift_code).toBe("N"); // Now using token
    });
  });

  test("12h: supervisor nights disabled blocks supervisor assignments", () => {
    const supervisorOnlyStaff = mockStaff.filter(s => s.role === "supervisor");
    
    const req: Record<number, Record<string, number>> = {
      0: { D: 1, N: 1 }
    };

    const input: GeneratorInput = {
      versionId: "test-version-2",
      system: "12h", 
      siteStartHH: 6,
      allowSupervisorNights: false,
      staff: supervisorOnlyStaff,
      requirementsByDay: req,
      startDate: "2025-09-10",
      includeNights: true
    };

    expect(() => {
      generateRosterEnhanced(input);
    }).toThrow("No eligible staff for Night shifts");
  });

  test("12h: supervisor nights enabled allows supervisor assignments", () => {
    const supervisorOnlyStaff = mockStaff.filter(s => s.role === "supervisor");
    
    const req: Record<number, Record<string, number>> = {
      0: { D: 1, N: 1 }
    };

    const input: GeneratorInput = {
      versionId: "test-version-3",
      system: "12h",
      siteStartHH: 6,
      allowSupervisorNights: true, // Allow supervisors for nights
      staff: supervisorOnlyStaff,
      requirementsByDay: req,
      startDate: "2025-09-10",
      includeNights: true
    };

    const result = generateRosterEnhanced(input);

    expect(result.nightsGenerated).toBe(1);
    expect(result.assignments.some(a => a.shift_code === "N")).toBe(true);
  });

  test("12h: mixed D/N demand preserves both tokens", () => {
    const req: Record<number, Record<string, number>> = {
      0: { D: 1, N: 1 },
      1: { D: 2, N: 0 }, // Only Day shifts
      2: { D: 0, N: 2 }  // Only Night shifts
    };

    const input: GeneratorInput = {
      versionId: "test-version-4",
      system: "12h",
      siteStartHH: 6,
      allowSupervisorNights: false,
      staff: mockStaff,
      requirementsByDay: req,
      startDate: "2025-09-10",
      includeNights: true
    };

    const result = generateRosterEnhanced(input);

    const dayAssignments = result.assignments.filter(a => a.shift_code === "D");
    const nightAssignments = result.assignments.filter(a => a.shift_code === "N");

    expect(dayAssignments.length).toBe(3); // 1+2+0 = 3
    expect(nightAssignments.length).toBe(3); // 1+0+2 = 3
    expect(result.nightsGenerated).toBe(3);
  });
});