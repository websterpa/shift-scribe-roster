/**
 * Pattern Behavior Tests
 * 
 * Comprehensive tests for pattern expansion, adherence, and constraints:
 * - Pattern sequence repetition and anchor date alignment
 * - E/L → D remapping in 12h framework
 * - R days never produce assignments in pattern-locked mode
 * - Absence overlay blocks duties on those dates
 */

import { describe, it, expect, vi } from 'vitest';
import { expandPatternOverRange } from '@/features/roster/patterns/expand';
import { generatePatternLockedDuties } from '@/features/roster/patterns/generator';
import { overlayAbsencesOnPatterns, type AbsenceRecord } from '@/features/roster/patterns/overlayAbsence';
import type { PatternTemplate, StaffPatternBinding, ExpandedPatternDay } from '@/features/roster/patterns/types';

// ============================================================================
// MOCK SETUP
// ============================================================================

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        in: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// ============================================================================
// TEST: PATTERN EXPANSION & ANCHOR ALIGNMENT
// ============================================================================

describe('Pattern Expansion - Sequence Repetition & Anchor Alignment', () => {
  it('should repeat 3-day sequence correctly over 9 days', () => {
    const template: PatternTemplate = {
      id: 'test-pattern',
      pattern_name: 'Simple 3-Day',
      pattern_sequence: ['D', 'N', 'R'],
      pattern_length: 3,
      tenant_id: 'test-tenant',
    };

    const binding: StaffPatternBinding = {
      staff_id: 'staff-1',
      pattern_id: 'test-pattern',
      pattern_start_date: '2025-01-01', // Anchor date
    };

    const expanded = expandPatternOverRange(
      template,
      binding,
      '2025-01-01', // Start on anchor
      '2025-01-09'  // 9 days total
    );

    expect(expanded).toHaveLength(9);
    
    // Verify sequence repeats: D, N, R, D, N, R, D, N, R
    expect(expanded[0].shift_code).toBe('D'); // Day 1
    expect(expanded[1].shift_code).toBe('N'); // Day 2
    expect(expanded[2].shift_code).toBe('R'); // Day 3
    expect(expanded[3].shift_code).toBe('D'); // Day 4 (repeat)
    expect(expanded[4].shift_code).toBe('N'); // Day 5
    expect(expanded[5].shift_code).toBe('R'); // Day 6
    expect(expanded[6].shift_code).toBe('D'); // Day 7
    expect(expanded[7].shift_code).toBe('N'); // Day 8
    expect(expanded[8].shift_code).toBe('R'); // Day 9
  });

  it('should align pattern correctly when roster starts after anchor date', () => {
    const template: PatternTemplate = {
      id: 'test-pattern',
      pattern_name: 'Simple 4-Day',
      pattern_sequence: ['D', 'E', 'N', 'R'],
      pattern_length: 4,
      tenant_id: 'test-tenant',
    };

    const binding: StaffPatternBinding = {
      staff_id: 'staff-1',
      pattern_id: 'test-pattern',
      pattern_start_date: '2025-01-01', // Anchor
    };

    // Start roster 5 days after anchor (should be on day 2 of pattern: 'E')
    const expanded = expandPatternOverRange(
      template,
      binding,
      '2025-01-06', // 5 days after anchor
      '2025-01-09'  // 4 days total
    );

    expect(expanded).toHaveLength(4);
    
    // Pattern on day 5 after anchor: offset=5, idx=5%4=1 → 'E'
    expect(expanded[0].shift_code).toBe('E'); // Jan 6
    expect(expanded[1].shift_code).toBe('N'); // Jan 7
    expect(expanded[2].shift_code).toBe('R'); // Jan 8
    expect(expanded[3].shift_code).toBe('D'); // Jan 9 (wraps to start)
  });

  it('should handle roster starting before anchor date (negative offset)', () => {
    const template: PatternTemplate = {
      id: 'test-pattern',
      pattern_name: 'Simple 3-Day',
      pattern_sequence: ['D', 'N', 'R'],
      pattern_length: 3,
      tenant_id: 'test-tenant',
    };

    const binding: StaffPatternBinding = {
      staff_id: 'staff-1',
      pattern_id: 'test-pattern',
      pattern_start_date: '2025-01-10', // Anchor in future
    };

    // Start roster before anchor
    const expanded = expandPatternOverRange(
      template,
      binding,
      '2025-01-07', // 3 days before anchor
      '2025-01-09'  // Ends 1 day before anchor
    );

    expect(expanded).toHaveLength(3);
    
    // Offset=-3, idx=(-3 % 3 + 3) % 3 = 0 → 'D'
    expect(expanded[0].shift_code).toBe('D'); // Jan 7
    expect(expanded[1].shift_code).toBe('N'); // Jan 8
    expect(expanded[2].shift_code).toBe('R'); // Jan 9
  });
});

// ============================================================================
// TEST: E/L → D REMAPPING IN 12H FRAMEWORK
// ============================================================================

describe('Pattern Remapping - 12h Framework E/L → D', () => {
  it('should remap E to D in 12h framework during duty generation', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Mock pattern resolution
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'staff_pattern_bindings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({
                data: [{
                  id: 'binding-1',
                  staff_id: 'staff-1',
                  pattern_id: 'pattern-1',
                  pattern_start_date: '2025-01-01',
                  tenant_id: 'tenant-1',
                }],
                error: null,
              })),
            })),
          })),
        } as any;
      }
      if (table === 'pattern_templates') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({
                data: [{
                  id: 'pattern-1',
                  pattern_name: '8h Pattern with E',
                  pattern_sequence: ['E', 'L', 'R'],
                  pattern_length: 3,
                  tenant_id: 'tenant-1',
                }],
                error: null,
              })),
            })),
          })),
        } as any;
      }
      if (table === 'staff_profiles') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({
              data: [],
              error: null,
            })),
          })),
        } as any;
      }
      if (table === 'leave_requests') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({
                    data: [],
                    error: null,
                  })),
                })),
              })),
            })),
          })),
        } as any;
      }
      return {} as any;
    });

    const result = await generatePatternLockedDuties({
      startDate: '2025-01-01',
      endDate: '2025-01-03',
      staffIds: ['staff-1'],
      tenantId: 'tenant-1',
      framework: '12h', // 12h framework
    });

    // Both E and L should be remapped to D
    expect(result.duties).toHaveLength(2);
    expect(result.duties[0].shiftCode).toBe('D'); // E → D
    expect(result.duties[1].shiftCode).toBe('D'); // L → D
  });

  it('should preserve E and L in 8h framework', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'staff_pattern_bindings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({
                data: [{
                  id: 'binding-1',
                  staff_id: 'staff-1',
                  pattern_id: 'pattern-1',
                  pattern_start_date: '2025-01-01',
                  tenant_id: 'tenant-1',
                }],
                error: null,
              })),
            })),
          })),
        } as any;
      }
      if (table === 'pattern_templates') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({
                data: [{
                  id: 'pattern-1',
                  pattern_name: '8h Pattern',
                  pattern_sequence: ['E', 'L', 'R'],
                  pattern_length: 3,
                  tenant_id: 'tenant-1',
                }],
                error: null,
              })),
            })),
          })),
        } as any;
      }
      if (table === 'staff_profiles') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({
              data: [],
              error: null,
            })),
          })),
        } as any;
      }
      if (table === 'leave_requests') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({
                    data: [],
                    error: null,
                  })),
                })),
              })),
            })),
          })),
        } as any;
      }
      return {} as any;
    });

    const result = await generatePatternLockedDuties({
      startDate: '2025-01-01',
      endDate: '2025-01-03',
      staffIds: ['staff-1'],
      tenantId: 'tenant-1',
      framework: '8h', // 8h framework
    });

    // E and L should be preserved in 8h
    expect(result.duties).toHaveLength(2);
    expect(result.duties[0].shiftCode).toBe('E'); // Preserved
    expect(result.duties[1].shiftCode).toBe('L'); // Preserved
  });
});

// ============================================================================
// TEST: R DAYS NEVER PRODUCE ASSIGNMENTS
// ============================================================================

describe('Pattern Constraints - Rest Days Preservation', () => {
  it('should never create duties on R days in pattern', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'staff_pattern_bindings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({
                data: [{
                  id: 'binding-1',
                  staff_id: 'staff-1',
                  pattern_id: 'pattern-1',
                  pattern_start_date: '2025-01-01',
                  tenant_id: 'tenant-1',
                }],
                error: null,
              })),
            })),
          })),
        } as any;
      }
      if (table === 'pattern_templates') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({
                data: [{
                  id: 'pattern-1',
                  pattern_name: 'D-R-D-R Pattern',
                  pattern_sequence: ['D', 'R', 'D', 'R', 'D', 'R', 'D'],
                  pattern_length: 7,
                  tenant_id: 'tenant-1',
                }],
                error: null,
              })),
            })),
          })),
        } as any;
      }
      if (table === 'staff_profiles') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({
              data: [],
              error: null,
            })),
          })),
        } as any;
      }
      if (table === 'leave_requests') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({
                    data: [],
                    error: null,
                  })),
                })),
              })),
            })),
          })),
        } as any;
      }
      return {} as any;
    });

    const result = await generatePatternLockedDuties({
      startDate: '2025-01-01',
      endDate: '2025-01-07',
      staffIds: ['staff-1'],
      tenantId: 'tenant-1',
      framework: '12h',
    });

    // Pattern: D, R, D, R, D, R, D = 4 D days, 3 R days
    expect(result.duties).toHaveLength(4); // Only D days
    
    // Verify no duties on R days (Jan 2, 4, 6)
    const dutyDates = result.duties.map(d => d.date);
    expect(dutyDates).not.toContain('2025-01-02');
    expect(dutyDates).not.toContain('2025-01-04');
    expect(dutyDates).not.toContain('2025-01-06');
    
    // Verify duties only on D days (Jan 1, 3, 5, 7)
    expect(dutyDates).toContain('2025-01-01');
    expect(dutyDates).toContain('2025-01-03');
    expect(dutyDates).toContain('2025-01-05');
    expect(dutyDates).toContain('2025-01-07');
  });

  it('should mark R days with is_rest flag in expansion', () => {
    const template: PatternTemplate = {
      id: 'test-pattern',
      pattern_name: 'Work-Rest Pattern',
      pattern_sequence: ['D', 'R', 'N', 'R'],
      pattern_length: 4,
      tenant_id: 'test-tenant',
    };

    const binding: StaffPatternBinding = {
      staff_id: 'staff-1',
      pattern_id: 'test-pattern',
      pattern_start_date: '2025-01-01',
    };

    const expanded = expandPatternOverRange(
      template,
      binding,
      '2025-01-01',
      '2025-01-04'
    );

    expect(expanded).toHaveLength(4);
    expect(expanded[0].is_rest).toBe(false); // D
    expect(expanded[1].is_rest).toBe(true);  // R
    expect(expanded[2].is_rest).toBe(false); // N
    expect(expanded[3].is_rest).toBe(true);  // R
  });
});

// ============================================================================
// TEST: ABSENCE OVERLAY BLOCKS DUTIES
// ============================================================================

describe('Absence Overlay - Duty Blocking', () => {
  it('should block duties on absence days', () => {
    const expansions = new Map<string, ExpandedPatternDay[]>([
      ['staff-1', [
        { date: '2025-01-01', shift_code: 'D', is_rest: false },
        { date: '2025-01-02', shift_code: 'N', is_rest: false },
        { date: '2025-01-03', shift_code: 'D', is_rest: false },
        { date: '2025-01-04', shift_code: 'R', is_rest: true },
      ]],
    ]);

    const absences: AbsenceRecord[] = [
      {
        staffId: 'staff-1',
        startDate: '2025-01-02',
        endDate: '2025-01-02',
        leaveType: 'annual',
        status: 'approved',
      },
    ];

    const result = overlayAbsencesOnPatterns(expansions, absences);
    const staff1Days = result.get('staff-1')!;

    expect(staff1Days).toHaveLength(4);
    
    // Jan 1 - no absence
    expect(staff1Days[0].absence).toBeUndefined();
    
    // Jan 2 - has absence, should be marked
    expect(staff1Days[1].absence).toBe('A');
    expect(staff1Days[1].absenceType).toBe('annual');
    expect(staff1Days[1].shift_code).toBe('R'); // Converted to R
    expect(staff1Days[1].is_rest).toBe(true);
    
    // Jan 3 - no absence
    expect(staff1Days[2].absence).toBeUndefined();
    
    // Jan 4 - already rest, no absence
    expect(staff1Days[3].absence).toBeUndefined();
    expect(staff1Days[3].is_rest).toBe(true);
  });

  it('should block duties on multi-day absence range', () => {
    const expansions = new Map<string, ExpandedPatternDay[]>([
      ['staff-1', [
        { date: '2025-01-01', shift_code: 'D', is_rest: false },
        { date: '2025-01-02', shift_code: 'N', is_rest: false },
        { date: '2025-01-03', shift_code: 'E', is_rest: false },
        { date: '2025-01-04', shift_code: 'L', is_rest: false },
        { date: '2025-01-05', shift_code: 'D', is_rest: false },
      ]],
    ]);

    const absences: AbsenceRecord[] = [
      {
        staffId: 'staff-1',
        startDate: '2025-01-02',
        endDate: '2025-01-04', // 3-day absence
        leaveType: 'sick',
        status: 'approved',
      },
    ];

    const result = overlayAbsencesOnPatterns(expansions, absences);
    const staff1Days = result.get('staff-1')!;

    // Jan 1 - before absence
    expect(staff1Days[0].absence).toBeUndefined();
    expect(staff1Days[0].is_rest).toBe(false);
    
    // Jan 2-4 - absence days
    expect(staff1Days[1].absence).toBe('A');
    expect(staff1Days[1].is_rest).toBe(true);
    expect(staff1Days[2].absence).toBe('A');
    expect(staff1Days[2].is_rest).toBe(true);
    expect(staff1Days[3].absence).toBe('A');
    expect(staff1Days[3].is_rest).toBe(true);
    
    // Jan 5 - after absence
    expect(staff1Days[4].absence).toBeUndefined();
    expect(staff1Days[4].is_rest).toBe(false);
  });

  it('should not create duties on absence-blocked days in pattern generation', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'staff_pattern_bindings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({
                data: [{
                  id: 'binding-1',
                  staff_id: 'staff-1',
                  pattern_id: 'pattern-1',
                  pattern_start_date: '2025-01-01',
                  tenant_id: 'tenant-1',
                }],
                error: null,
              })),
            })),
          })),
        } as any;
      }
      if (table === 'pattern_templates') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({
                data: [{
                  id: 'pattern-1',
                  pattern_name: 'All D Pattern',
                  pattern_sequence: ['D', 'D', 'D', 'D', 'D'],
                  pattern_length: 5,
                  tenant_id: 'tenant-1',
                }],
                error: null,
              })),
            })),
          })),
        } as any;
      }
      if (table === 'staff_profiles') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({
              data: [],
              error: null,
            })),
          })),
        } as any;
      }
      if (table === 'leave_requests') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({
                    data: [{
                      staff_id: 'staff-1',
                      start_date: '2025-01-03',
                      end_date: '2025-01-03',
                      leave_type: 'annual',
                      status: 'approved',
                    }],
                    error: null,
                  })),
                })),
              })),
            })),
          })),
        } as any;
      }
      return {} as any;
    });

    const result = await generatePatternLockedDuties({
      startDate: '2025-01-01',
      endDate: '2025-01-05',
      staffIds: ['staff-1'],
      tenantId: 'tenant-1',
      framework: '12h',
    });

    // Pattern has 5 D days, but Jan 3 has absence
    expect(result.duties).toHaveLength(4); // 5 - 1 absence
    
    const dutyDates = result.duties.map(d => d.date);
    expect(dutyDates).not.toContain('2025-01-03'); // Blocked by absence
    expect(dutyDates).toContain('2025-01-01');
    expect(dutyDates).toContain('2025-01-02');
    expect(dutyDates).toContain('2025-01-04');
    expect(dutyDates).toContain('2025-01-05');
  });
});

// ============================================================================
// TEST: COMPREHENSIVE BEHAVIOR
// ============================================================================

describe('Pattern Behavior - Integration', () => {
  it('should handle complex pattern with all constraints', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Pattern: E, L, N, R, D, R, D (7-day cycle)
    // Framework: 12h (E→D, L→D, N preserved)
    // Absence: Jan 5
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'staff_pattern_bindings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({
                data: [{
                  id: 'binding-1',
                  staff_id: 'staff-1',
                  pattern_id: 'pattern-1',
                  pattern_start_date: '2025-01-01',
                  tenant_id: 'tenant-1',
                }],
                error: null,
              })),
            })),
          })),
        } as any;
      }
      if (table === 'pattern_templates') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({
                data: [{
                  id: 'pattern-1',
                  pattern_name: 'Complex Pattern',
                  pattern_sequence: ['E', 'L', 'N', 'R', 'D', 'R', 'D'],
                  pattern_length: 7,
                  tenant_id: 'tenant-1',
                }],
                error: null,
              })),
            })),
          })),
        } as any;
      }
      if (table === 'staff_profiles') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({
              data: [],
              error: null,
            })),
          })),
        } as any;
      }
      if (table === 'leave_requests') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({
                    data: [{
                      staff_id: 'staff-1',
                      start_date: '2025-01-05',
                      end_date: '2025-01-05',
                      leave_type: 'annual',
                      status: 'approved',
                    }],
                    error: null,
                  })),
                })),
              })),
            })),
          })),
        } as any;
      }
      return {} as any;
    });

    const result = await generatePatternLockedDuties({
      startDate: '2025-01-01',
      endDate: '2025-01-07',
      staffIds: ['staff-1'],
      tenantId: 'tenant-1',
      framework: '12h',
    });

    // Expected:
    // Jan 1 (E) → D (remapped)
    // Jan 2 (L) → D (remapped)
    // Jan 3 (N) → N (preserved)
    // Jan 4 (R) → no duty
    // Jan 5 (D) → no duty (absence)
    // Jan 6 (R) → no duty
    // Jan 7 (D) → D
    
    expect(result.duties).toHaveLength(4);
    
    const duties = result.duties.sort((a, b) => a.date.localeCompare(b.date));
    expect(duties[0]).toMatchObject({ date: '2025-01-01', shiftCode: 'D' });
    expect(duties[1]).toMatchObject({ date: '2025-01-02', shiftCode: 'D' });
    expect(duties[2]).toMatchObject({ date: '2025-01-03', shiftCode: 'N' });
    expect(duties[3]).toMatchObject({ date: '2025-01-07', shiftCode: 'D' });
  });
});
