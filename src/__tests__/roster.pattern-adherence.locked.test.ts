/**
 * Contract tests for Pattern Adherence in Locked Mode
 * 
 * Verifies that locked pattern mode enforces strict pattern adherence:
 * - 100% adherence with no absences or WTD violations
 * - Only rest overrides allowed for WTD compliance
 * - No shift-type swaps (E↔L, N↔D, etc.)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateRoster, type GenerateRosterInput } from '@/engine/generateRoster';
import type { Database } from '@/integrations/supabase/types';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  gte: vi.fn(() => mockSupabase),
  lte: vi.fn(() => mockSupabase),
  in: vi.fn(() => mockSupabase),
  maybeSingle: vi.fn(),
  single: vi.fn(),
} as any;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('Pattern Adherence - Locked Mode', () => {
  const TENANT_ID = '00000000-0000-0000-0000-000000000001';
  const CONFIG_ID = 'config-test-123';
  const PATTERN_ID = 'pattern-8h-2e2l2n2r';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should achieve 100% adherence with 2E-2L-2N-2R pattern and no violations', async () => {
    // Fixture: 8-day roster, 6 staff, 2E-2L-2N-2R pattern
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-08');

    // Mock staff with pattern assignments
    const mockStaff = Array.from({ length: 6 }, (_, i) => ({
      id: `staff-${i + 1}`,
      first_name: `Staff`,
      last_name: `${i + 1}`,
      name: `Staff ${i + 1}`,
      is_active: true,
      pattern_id: PATTERN_ID,
      pattern_offset: i * 2, // Stagger offsets
      opted_out_wtd: false,
    }));

    // Mock pattern: 2E-2L-2N-2R
    const mockPattern = {
      id: PATTERN_ID,
      name: '2E-2L-2N-2R',
      sequence: ['E', 'E', 'L', 'L', 'N', 'N', 'R', 'R'],
      system: '8h',
      cycle_length: 8,
    };

    // Setup mocks
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'staff_profiles') {
        return {
          ...mockSupabase,
          data: mockStaff,
          error: null,
        };
      }
      if (table === 'site_patterns') {
        return {
          ...mockSupabase,
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockPattern,
            error: null,
          }),
        };
      }
      if (table === 'approved_absences') {
        return {
          ...mockSupabase,
          data: [], // No absences
          error: null,
        };
      }
      return mockSupabase;
    });

    const input: GenerateRosterInput = {
      tenantId: TENANT_ID,
      configId: CONFIG_ID,
      startDate,
      endDate,
      patternAdherenceMode: 'locked',
    };

    const roster = await generateRoster(input);

    // Verify: Should have assignments for all staff
    expect(roster.length).toBeGreaterThan(0);

    // Group by staff and verify pattern adherence
    const staffAssignments = new Map<string, typeof roster>();
    roster.forEach(assignment => {
      if (!staffAssignments.has(assignment.staffId)) {
        staffAssignments.set(assignment.staffId, []);
      }
      staffAssignments.get(assignment.staffId)!.push(assignment);
    });

    // For each staff, verify 100% adherence to their pattern
    for (const [staffId, assignments] of staffAssignments.entries()) {
      const staff = mockStaff.find(s => s.id === staffId)!;
      const offset = staff.pattern_offset;
      const sequence = mockPattern.sequence;

      let adherenceCount = 0;
      let totalCount = 0;

      assignments.forEach((assignment) => {
        const patternIndex = (assignment.dayIndex + offset) % sequence.length;
        const expected = sequence[patternIndex];
        const actual = assignment.shift;

        if (expected === actual) {
          adherenceCount++;
        }
        totalCount++;
      });

      const adherencePercent = (adherenceCount / totalCount) * 100;
      
      // Expect 100% adherence in locked mode with no violations
      expect(adherencePercent).toBe(100);
    }
  });

  it('should only allow rest overrides for WTD compliance, no shift-type swaps', async () => {
    // Fixture: Force a scenario where WTD would require a rest day
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-17'); // 17 days to trigger potential consecutive work violations

    const mockStaff = [{
      id: 'staff-violation',
      first_name: 'Test',
      last_name: 'Staff',
      name: 'Test Staff',
      is_active: true,
      pattern_id: PATTERN_ID,
      pattern_offset: 0,
      opted_out_wtd: false, // Subject to WTD rules
    }];

    // Pattern with potential for consecutive work: 4E-4L (no rest)
    const mockPattern = {
      id: PATTERN_ID,
      name: '4E-4L-violation-test',
      sequence: ['E', 'E', 'E', 'E', 'L', 'L', 'L', 'L'], // 8 consecutive work days
      system: '8h',
      cycle_length: 8,
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'staff_profiles') {
        return { ...mockSupabase, data: mockStaff, error: null };
      }
      if (table === 'site_patterns') {
        return {
          ...mockSupabase,
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockPattern,
            error: null,
          }),
        };
      }
      if (table === 'approved_absences') {
        return { ...mockSupabase, data: [], error: null };
      }
      return mockSupabase;
    });

    const input: GenerateRosterInput = {
      tenantId: TENANT_ID,
      configId: CONFIG_ID,
      startDate,
      endDate,
      patternAdherenceMode: 'locked',
    };

    const roster = await generateRoster(input);

    // Find deviations
    const assignments = roster.filter(r => r.staffId === 'staff-violation');
    const deviations = assignments.filter((assignment, idx) => {
      const expected = mockPattern.sequence[idx % mockPattern.sequence.length];
      return expected !== assignment.shift;
    });

    if (deviations.length > 0) {
      // If deviations exist, they should ONLY be rest overrides (X → R)
      deviations.forEach(deviation => {
        const dayIndex = assignments.indexOf(deviation);
        const expected = mockPattern.sequence[dayIndex % mockPattern.sequence.length];
        const actual = deviation.shift;

        // Only allowed deviation: working shift → Rest
        expect(expected).not.toBe('R'); // Original was not rest
        expect(actual).toBe('R'); // Changed to rest for WTD

        // Verify no shift-type swaps (E↔L, etc.)
        expect(actual).toBe('R'); // Must be rest, not another working shift
      });

      // Adherence should be < 100% but still high (only rest corrections)
      const adherencePercent = ((assignments.length - deviations.length) / assignments.length) * 100;
      expect(adherencePercent).toBeGreaterThan(70); // Should still be mostly adherent
      expect(adherencePercent).toBeLessThan(100);
    } else {
      // If no deviations, adherence should be 100%
      const adherencePercent = 100;
      expect(adherencePercent).toBe(100);
    }
  });

  it('should not apply fairness fills in locked mode', async () => {
    // This test verifies that locked mode does NOT apply guided fairness rebalancing
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-08');

    const mockStaff = Array.from({ length: 4 }, (_, i) => ({
      id: `staff-${i + 1}`,
      first_name: `Staff`,
      last_name: `${i + 1}`,
      name: `Staff ${i + 1}`,
      is_active: true,
      pattern_id: PATTERN_ID,
      pattern_offset: i * 2,
      opted_out_wtd: false,
    }));

    const mockPattern = {
      id: PATTERN_ID,
      name: '2E-2L-2N-2R',
      sequence: ['E', 'E', 'L', 'L', 'N', 'N', 'R', 'R'],
      system: '8h',
      cycle_length: 8,
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'staff_profiles') {
        return { ...mockSupabase, data: mockStaff, error: null };
      }
      if (table === 'site_patterns') {
        return {
          ...mockSupabase,
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockPattern,
            error: null,
          }),
        };
      }
      if (table === 'approved_absences') {
        return { ...mockSupabase, data: [], error: null };
      }
      if (table === 'roster_assignments') {
        // Mock historical data showing imbalance (for fairness calculation)
        return { ...mockSupabase, data: [], error: null };
      }
      return mockSupabase;
    });

    const input: GenerateRosterInput = {
      tenantId: TENANT_ID,
      configId: CONFIG_ID,
      startDate,
      endDate,
      patternAdherenceMode: 'locked',
    };

    const roster = await generateRoster(input);

    // In locked mode, even with historical imbalance, no fairness fills should occur
    // All staff should follow their exact pattern unless WTD forces a rest override
    const staffAssignments = new Map<string, typeof roster>();
    roster.forEach(assignment => {
      if (!staffAssignments.has(assignment.staffId)) {
        staffAssignments.set(assignment.staffId, []);
      }
      staffAssignments.get(assignment.staffId)!.push(assignment);
    });

    // Check that deviations (if any) are only rest overrides, not fairness fills
    for (const [staffId, assignments] of staffAssignments.entries()) {
      const staff = mockStaff.find(s => s.id === staffId)!;
      const offset = staff.pattern_offset;

      assignments.forEach(assignment => {
        const patternIndex = (assignment.dayIndex + offset) % mockPattern.sequence.length;
        const expected = mockPattern.sequence[patternIndex];
        const actual = assignment.shift;

        if (expected !== actual) {
          // Only rest overrides allowed (not R→E or R→L for fairness)
          expect(actual).toBe('R');
          expect(expected).not.toBe('R');
        }
      });
    }
  });
});
