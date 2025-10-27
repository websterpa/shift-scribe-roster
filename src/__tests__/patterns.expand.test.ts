/**
 * Unit tests for pattern expansion
 */

import { describe, it, expect } from 'vitest';
import { expandPatternOverRange } from '@/features/roster/patterns/expand';
import type { PatternTemplate, StaffPatternBinding } from '@/features/roster/patterns/types';

describe('expandPatternOverRange', () => {
  const mockTemplate: PatternTemplate = {
    id: 'test-pattern-1',
    tenant_id: 'tenant-123',
    site_id: null,
    pattern_name: '4 on 4 off (DDNN)',
    pattern_sequence: ['D', 'D', 'N', 'N', 'R', 'R', 'R', 'R'],
    pattern_length: 8,
  };

  const mockBinding: StaffPatternBinding = {
    staff_id: 'staff-123',
    pattern_id: 'test-pattern-1',
    pattern_start_date: '2025-01-01', // Wednesday
  };

  it('expands pattern over two complete cycles', () => {
    // 2 cycles = 16 days
    const result = expandPatternOverRange(
      mockTemplate,
      mockBinding,
      '2025-01-01',
      '2025-01-16'
    );

    expect(result).toHaveLength(16);

    // First cycle: D,D,N,N,R,R,R,R
    expect(result[0].shift_code).toBe('D');
    expect(result[1].shift_code).toBe('D');
    expect(result[2].shift_code).toBe('N');
    expect(result[3].shift_code).toBe('N');
    expect(result[4].shift_code).toBe('R');
    expect(result[5].shift_code).toBe('R');
    expect(result[6].shift_code).toBe('R');
    expect(result[7].shift_code).toBe('R');

    // Second cycle: D,D,N,N,R,R,R,R
    expect(result[8].shift_code).toBe('D');
    expect(result[9].shift_code).toBe('D');
    expect(result[10].shift_code).toBe('N');
    expect(result[11].shift_code).toBe('N');
    expect(result[12].shift_code).toBe('R');
    expect(result[13].shift_code).toBe('R');
    expect(result[14].shift_code).toBe('R');
    expect(result[15].shift_code).toBe('R');
  });

  it('correctly marks rest days with is_rest flag', () => {
    const result = expandPatternOverRange(
      mockTemplate,
      mockBinding,
      '2025-01-01',
      '2025-01-08'
    );

    expect(result).toHaveLength(8);

    // D,D,N,N should NOT be rest
    expect(result[0].is_rest).toBe(false);
    expect(result[1].is_rest).toBe(false);
    expect(result[2].is_rest).toBe(false);
    expect(result[3].is_rest).toBe(false);

    // R,R,R,R should be rest
    expect(result[4].is_rest).toBe(true);
    expect(result[5].is_rest).toBe(true);
    expect(result[6].is_rest).toBe(true);
    expect(result[7].is_rest).toBe(true);
  });

  it('handles partial cycle at the end', () => {
    // Start + 10 days = 11 days total (1 full cycle + 3 days)
    const result = expandPatternOverRange(
      mockTemplate,
      mockBinding,
      '2025-01-01',
      '2025-01-11'
    );

    expect(result).toHaveLength(11);

    // Full cycle
    expect(result[0].shift_code).toBe('D');
    expect(result[7].shift_code).toBe('R');

    // Partial second cycle: D,D,N
    expect(result[8].shift_code).toBe('D');
    expect(result[9].shift_code).toBe('D');
    expect(result[10].shift_code).toBe('N');
  });

  it('correctly aligns pattern when roster starts mid-cycle', () => {
    // Pattern starts on 2025-01-01, but roster starts on 2025-01-03
    // Day 3 = index 2 = 'N'
    const result = expandPatternOverRange(
      mockTemplate,
      mockBinding,
      '2025-01-03',
      '2025-01-10'
    );

    expect(result).toHaveLength(8);
    expect(result[0].date).toBe('2025-01-03');
    expect(result[0].shift_code).toBe('N'); // index 2 in pattern
    expect(result[1].shift_code).toBe('N'); // index 3
    expect(result[2].shift_code).toBe('R'); // index 4
  });

  it('handles roster starting before pattern anchor date', () => {
    // Pattern starts 2025-01-05, roster starts 2025-01-01
    // Should count backwards: day -4 wraps to index 4 in pattern
    const binding: StaffPatternBinding = {
      staff_id: 'staff-123',
      pattern_id: 'test-pattern-1',
      pattern_start_date: '2025-01-05',
    };

    const result = expandPatternOverRange(
      mockTemplate,
      binding,
      '2025-01-01',
      '2025-01-08'
    );

    expect(result).toHaveLength(8);
    
    // -4 days from start: ((−4 % 8) + 8) % 8 = 4
    expect(result[0].shift_code).toBe('R'); // index 4
    expect(result[1].shift_code).toBe('R'); // index 5
    expect(result[2].shift_code).toBe('R'); // index 6
    expect(result[3].shift_code).toBe('R'); // index 7
    expect(result[4].shift_code).toBe('D'); // index 0 (anchor date)
  });

  it('generates correct ISO date strings', () => {
    const result = expandPatternOverRange(
      mockTemplate,
      mockBinding,
      '2025-01-01',
      '2025-01-03'
    );

    expect(result).toHaveLength(3);
    expect(result[0].date).toBe('2025-01-01');
    expect(result[1].date).toBe('2025-01-02');
    expect(result[2].date).toBe('2025-01-03');
  });

  it('validates output length equals days in range + 1', () => {
    // From 2025-01-01 to 2025-01-10 = 10 days difference + 1 = 11 days
    const result = expandPatternOverRange(
      mockTemplate,
      mockBinding,
      '2025-01-01',
      '2025-01-10'
    );

    expect(result).toHaveLength(11);
  });

  it('throws error for empty pattern sequence', () => {
    const emptyTemplate: PatternTemplate = {
      ...mockTemplate,
      pattern_sequence: [],
      pattern_length: 0,
    };

    expect(() => {
      expandPatternOverRange(
        emptyTemplate,
        mockBinding,
        '2025-01-01',
        '2025-01-10'
      );
    }).toThrow('empty sequence');
  });

  it('throws error for pattern length mismatch', () => {
    const mismatchTemplate: PatternTemplate = {
      ...mockTemplate,
      pattern_length: 10, // Wrong length
    };

    expect(() => {
      expandPatternOverRange(
        mismatchTemplate,
        mockBinding,
        '2025-01-01',
        '2025-01-10'
      );
    }).toThrow('length mismatch');
  });

  it('handles single day range', () => {
    const result = expandPatternOverRange(
      mockTemplate,
      mockBinding,
      '2025-01-01',
      '2025-01-01'
    );

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2025-01-01');
    expect(result[0].shift_code).toBe('D');
  });

  it('expands continental 12h pattern correctly', () => {
    const continentalTemplate: PatternTemplate = {
      id: 'continental',
      tenant_id: 'tenant-123',
      site_id: null,
      pattern_name: 'Continental 12h',
      pattern_sequence: ['D', 'D', 'N', 'N', 'R', 'R', 'R'],
      pattern_length: 7,
    };

    const result = expandPatternOverRange(
      continentalTemplate,
      mockBinding,
      '2025-01-01',
      '2025-01-14'
    );

    // Two complete weeks
    expect(result).toHaveLength(14);

    // First week
    expect(result[0].shift_code).toBe('D');
    expect(result[1].shift_code).toBe('D');
    expect(result[2].shift_code).toBe('N');
    expect(result[3].shift_code).toBe('N');
    expect(result[4].shift_code).toBe('R');
    expect(result[5].shift_code).toBe('R');
    expect(result[6].shift_code).toBe('R');

    // Second week (repeat)
    expect(result[7].shift_code).toBe('D');
    expect(result[8].shift_code).toBe('D');
    expect(result[9].shift_code).toBe('N');
    expect(result[10].shift_code).toBe('N');
    expect(result[11].shift_code).toBe('R');
    expect(result[12].shift_code).toBe('R');
    expect(result[13].shift_code).toBe('R');
  });
});
