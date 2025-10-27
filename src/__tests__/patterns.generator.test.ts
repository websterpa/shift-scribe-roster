/**
 * Unit tests for pattern-locked duty generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePatternLockedDuties, type PatternLockedInput } from '@/features/roster/patterns/generator';
import type { PatternTemplate, StaffPatternBinding } from '@/features/roster/patterns/types';

// Mock the pattern resolution and expansion modules
vi.mock('@/features/roster/patterns/resolve', () => ({
  resolvePatternsBatch: vi.fn(),
}));

vi.mock('@/features/roster/patterns/expand', () => ({
  expandPatternsBatch: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

import { resolvePatternsBatch } from '@/features/roster/patterns/resolve';
import { expandPatternsBatch } from '@/features/roster/patterns/expand';

describe('generatePatternLockedDuties', () => {
  const mockTemplate: PatternTemplate = {
    id: 'pattern-1',
    tenant_id: 'tenant-123',
    site_id: null,
    pattern_name: '4 on 4 off',
    pattern_sequence: ['D', 'D', 'N', 'N', 'R', 'R', 'R', 'R'],
    pattern_length: 8,
  };

  const mockBinding: StaffPatternBinding = {
    staff_id: 'staff-1',
    pattern_id: 'pattern-1',
    pattern_start_date: '2025-01-01',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates duties only on work days (not rest days)', async () => {
    // Mock pattern resolution
    vi.mocked(resolvePatternsBatch).mockResolvedValue(
      new Map([
        ['staff-1', { template: mockTemplate, binding: mockBinding }],
      ])
    );

    // Mock pattern expansion
    vi.mocked(expandPatternsBatch).mockReturnValue(
      new Map([
        ['staff-1', [
          { date: '2025-01-01', shift_code: 'D', is_rest: false },
          { date: '2025-01-02', shift_code: 'D', is_rest: false },
          { date: '2025-01-03', shift_code: 'N', is_rest: false },
          { date: '2025-01-04', shift_code: 'N', is_rest: false },
          { date: '2025-01-05', shift_code: 'R', is_rest: true },  // REST
          { date: '2025-01-06', shift_code: 'R', is_rest: true },  // REST
          { date: '2025-01-07', shift_code: 'R', is_rest: true },  // REST
          { date: '2025-01-08', shift_code: 'R', is_rest: true },  // REST
        ]],
      ])
    );

    const input: PatternLockedInput = {
      startDate: '2025-01-01',
      endDate: '2025-01-08',
      staffIds: ['staff-1'],
      tenantId: 'tenant-123',
      framework: '12h',
    };

    const result = await generatePatternLockedDuties(input);

    // Should only create duties for work days (D, D, N, N) - not R days
    expect(result.duties).toHaveLength(4);
    expect(result.duties.map(d => d.date)).toEqual([
      '2025-01-01',
      '2025-01-02',
      '2025-01-03',
      '2025-01-04',
    ]);

    // All duties should be from patterns
    expect(result.duties.every(d => d.source === 'pattern')).toBe(true);

    // No rest day duties
    expect(result.duties.every(d => d.shiftCode !== 'R')).toBe(true);
  });

  it('remaps E/L to D for 12h framework', async () => {
    const eightHourPattern: PatternTemplate = {
      ...mockTemplate,
      pattern_sequence: ['E', 'L', 'N', 'R', 'R'],
      pattern_length: 5,
    };

    vi.mocked(resolvePatternsBatch).mockResolvedValue(
      new Map([
        ['staff-1', { template: eightHourPattern, binding: mockBinding }],
      ])
    );

    vi.mocked(expandPatternsBatch).mockReturnValue(
      new Map([
        ['staff-1', [
          { date: '2025-01-01', shift_code: 'E', is_rest: false },
          { date: '2025-01-02', shift_code: 'L', is_rest: false },
          { date: '2025-01-03', shift_code: 'N', is_rest: false },
          { date: '2025-01-04', shift_code: 'R', is_rest: true },
          { date: '2025-01-05', shift_code: 'R', is_rest: true },
        ]],
      ])
    );

    const input: PatternLockedInput = {
      startDate: '2025-01-01',
      endDate: '2025-01-05',
      staffIds: ['staff-1'],
      tenantId: 'tenant-123',
      framework: '12h',
    };

    const result = await generatePatternLockedDuties(input);

    expect(result.duties).toHaveLength(3);
    
    // E and L should be remapped to D
    expect(result.duties[0].shiftCode).toBe('D'); // Was E
    expect(result.duties[1].shiftCode).toBe('D'); // Was L
    expect(result.duties[2].shiftCode).toBe('N'); // Stays N
  });

  it('preserves E/L/N for 8h framework', async () => {
    const eightHourPattern: PatternTemplate = {
      ...mockTemplate,
      pattern_sequence: ['E', 'L', 'N', 'R'],
      pattern_length: 4,
    };

    vi.mocked(resolvePatternsBatch).mockResolvedValue(
      new Map([
        ['staff-1', { template: eightHourPattern, binding: mockBinding }],
      ])
    );

    vi.mocked(expandPatternsBatch).mockReturnValue(
      new Map([
        ['staff-1', [
          { date: '2025-01-01', shift_code: 'E', is_rest: false },
          { date: '2025-01-02', shift_code: 'L', is_rest: false },
          { date: '2025-01-03', shift_code: 'N', is_rest: false },
          { date: '2025-01-04', shift_code: 'R', is_rest: true },
        ]],
      ])
    );

    const input: PatternLockedInput = {
      startDate: '2025-01-01',
      endDate: '2025-01-04',
      staffIds: ['staff-1'],
      tenantId: 'tenant-123',
      framework: '8h',
    };

    const result = await generatePatternLockedDuties(input);

    expect(result.duties).toHaveLength(3);
    
    // Shift codes should be preserved for 8h framework
    expect(result.duties[0].shiftCode).toBe('E');
    expect(result.duties[1].shiftCode).toBe('L');
    expect(result.duties[2].shiftCode).toBe('N');
  });

  it('handles multiple staff members', async () => {
    vi.mocked(resolvePatternsBatch).mockResolvedValue(
      new Map([
        ['staff-1', { template: mockTemplate, binding: mockBinding }],
        ['staff-2', { 
          template: mockTemplate, 
          binding: { ...mockBinding, staff_id: 'staff-2' } 
        }],
      ])
    );

    vi.mocked(expandPatternsBatch).mockReturnValue(
      new Map([
        ['staff-1', [
          { date: '2025-01-01', shift_code: 'D', is_rest: false },
          { date: '2025-01-02', shift_code: 'D', is_rest: false },
        ]],
        ['staff-2', [
          { date: '2025-01-01', shift_code: 'N', is_rest: false },
          { date: '2025-01-02', shift_code: 'N', is_rest: false },
        ]],
      ])
    );

    const input: PatternLockedInput = {
      startDate: '2025-01-01',
      endDate: '2025-01-02',
      staffIds: ['staff-1', 'staff-2'],
      tenantId: 'tenant-123',
      framework: '12h',
    };

    const result = await generatePatternLockedDuties(input);

    expect(result.duties).toHaveLength(4); // 2 days × 2 staff
    expect(result.staffWithPatterns).toHaveLength(2);
    expect(result.staffWithoutPatterns).toHaveLength(0);
  });

  it('tracks staff without patterns', async () => {
    // Only resolve pattern for staff-1
    vi.mocked(resolvePatternsBatch).mockResolvedValue(
      new Map([
        ['staff-1', { template: mockTemplate, binding: mockBinding }],
      ])
    );

    vi.mocked(expandPatternsBatch).mockReturnValue(
      new Map([
        ['staff-1', [
          { date: '2025-01-01', shift_code: 'D', is_rest: false },
        ]],
      ])
    );

    const input: PatternLockedInput = {
      startDate: '2025-01-01',
      endDate: '2025-01-01',
      staffIds: ['staff-1', 'staff-2', 'staff-3'],
      tenantId: 'tenant-123',
      framework: '12h',
    };

    const result = await generatePatternLockedDuties(input);

    expect(result.staffWithPatterns).toEqual(['staff-1']);
    expect(result.staffWithoutPatterns).toEqual(['staff-2', 'staff-3']);
    expect(result.warnings).toHaveLength(2); // One warning per missing pattern
  });

  it('returns empty result when no patterns resolved', async () => {
    vi.mocked(resolvePatternsBatch).mockResolvedValue(new Map());
    vi.mocked(expandPatternsBatch).mockReturnValue(new Map());

    const input: PatternLockedInput = {
      startDate: '2025-01-01',
      endDate: '2025-01-05',
      staffIds: ['staff-1'],
      tenantId: 'tenant-123',
      framework: '12h',
    };

    const result = await generatePatternLockedDuties(input);

    expect(result.duties).toHaveLength(0);
    expect(result.staffWithPatterns).toHaveLength(0);
    expect(result.staffWithoutPatterns).toEqual(['staff-1']);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
