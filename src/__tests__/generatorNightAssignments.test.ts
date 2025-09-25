import { generateAssignments } from '@/utils/roster/assignmentGenerator';
import { StaffMember } from '@/types/roster';

describe('Generator Night Assignments', () => {
  const mockStaffList: StaffMember[] = [
    {
      id: 'staff1',
      first_name: 'Jane',
      last_name: 'Doe', 
      eligible_shifts: ['Night'],
      employee_id: 'EMP001',
      email: 'jane@example.com',
      hire_date: '2025-01-01',
      is_active: true,
      is_shift_worker: true,
      hourly_rate: 20.00,
      role: 'Staff',
      phone: '',
      unavailable_from: null,
      expected_return_date: null,
      unavailability_reason: null,
      unavailability_notes: null,
      availability_status: 'active' as const,
      min_hours_per_week: 20,
      max_hours_per_week: 48,
      opted_out_wtd: false,
      days_off_per_week: 2,
      holiday_multiplier: 2,
      leave_allowance_days: 28
    }
  ];

  const mockConfig = {
    shift_type: '8h' as const,
    operational_hours_per_day: 24,
    handshake_minutes: 30,
    start_date: '2025-01-01',
    site_start_time: '06:00',
    timezone: 'Europe/London'
  };

  test('generator with N=1 produces Night assignments', () => {
    const cycle = [
      { day: 0, staffId: 'staff1', shiftCode: 'N', date: '2025-01-01' }
    ];

    const assignments = generateAssignments(
      mockStaffList,
      cycle,
      mockConfig,
      {}, // leaveMap
      {}  // pastWeeksMap
    );

    expect(assignments).toHaveLength(1);
    expect(assignments[0].shift_code).toBe('Night');
    expect(assignments[0].staff_id).toBe('staff1');
  });

  test('Night assignments have proper anchoring to start date', () => {
    const cycle = [
      { day: 0, staffId: 'staff1', shiftCode: 'N', date: '2025-01-01' },
      { day: 1, staffId: 'staff1', shiftCode: 'N', date: '2025-01-02' }
    ];

    const assignments = generateAssignments(
      mockStaffList,
      cycle,
      mockConfig,
      {},
      {}
    );

    expect(assignments).toHaveLength(2);
    expect(assignments[0].date).toBe('2025-01-01');
    expect(assignments[1].date).toBe('2025-01-02');
    
    // Both should be Night shifts
    assignments.forEach(assignment => {
      expect(assignment.shift_code).toBe('Night');
    });
  });

  test('overnight Night shifts span to next day properly', () => {
    const cycle = [
      { day: 0, staffId: 'staff1', shiftCode: 'N', date: '2025-01-01' }
    ];

    const assignments = generateAssignments(
      mockStaffList,
      cycle,
      mockConfig,
      {},
      {}
    );

    const nightAssignment = assignments[0];
    expect(nightAssignment.shift_code).toBe('Night');
    
    // Check that shift_start and shift_end are present for night shifts
    expect(nightAssignment.shift_start).toBeTruthy();
    expect(nightAssignment.shift_end).toBeTruthy();
    
    if (nightAssignment.shift_start && nightAssignment.shift_end) {
      const startDate = new Date(nightAssignment.shift_start);
      const endDate = new Date(nightAssignment.shift_end);
      
      // Night shift should end after it starts
      expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
    }
  });
});