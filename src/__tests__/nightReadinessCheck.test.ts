import { checkNightReadiness } from "@/utils/roster/nightReadinessCheck";
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

describe("checkNightReadiness", () => {
  test("passes when nights not expected", () => {
    const result = checkNightReadiness({
      system: "8h",
      staff: [createStaff()],
      includeNights: false
    });
    
    expect(result.ready).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test("fails when no eligible staff for nights", () => {
    const supervisor = createStaff({ role: "Supervisor" });
    
    const result = checkNightReadiness({
      system: "12h",
      staff: [supervisor],
      allowSupervisorNights: false
    });
    
    expect(result.ready).toBe(false);
    expect(result.issues).toContain(expect.stringMatching(/No eligible staff for Night shifts/));
  });

  test("passes when supervisor nights allowed", () => {
    const supervisor = createStaff({ role: "Supervisor" });
    
    const result = checkNightReadiness({
      system: "12h",
      staff: [supervisor],
      allowSupervisorNights: true
    });
    
    expect(result.ready).toBe(true);
  });

  test("fails when 12h pattern has no N tokens", () => {
    const result = checkNightReadiness({
      system: "12h",
      staff: [createStaff()],
      patternTokens: ["D", "R", "D"]
    });
    
    expect(result.ready).toBe(false);
    expect(result.issues).toContain(expect.stringMatching(/Pattern contains no 'N' tokens/));
  });

  test("fails when no staff eligible for night shifts", () => {
    const dayOnlyStaff = createStaff({ eligible_shifts: ["D", "E", "L"] });
    
    const result = checkNightReadiness({
      system: "12h",
      staff: [dayOnlyStaff]
    });
    
    expect(result.ready).toBe(false);
    expect(result.issues).toContain(expect.stringMatching(/No staff members have Night shifts/));
  });
});