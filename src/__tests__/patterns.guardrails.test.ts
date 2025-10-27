/**
 * Unit tests for pattern-locked generation guardrails
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePatternLockedDuties, type PatternLockedInput } from '@/features/roster/patterns/generator';
import type { ShiftCode } from '@/features/roster/patterns/types';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          data: [
            { id: 'staff-1', first_name: 'John', last_name: 'Doe', name: null },
            { id: 'staff-2', first_name: 'Jane', last_name: 'Smith', name: null },
          ],
          error: null,
        })),
      })),
    })),
  },
}));

vi.mock('@/features/roster/patterns/resolve', () => ({
  resolvePatternsBatch: vi.fn(),
}));

vi.mock('@/features/roster/patterns/expand', () => ({
  expandPatternsBatch: vi.fn(),
}));

vi.mock('@/features/roster/patterns/overlayAbsence', () => ({
  applyAbsenceOverlay: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

import { resolvePatternsBatch } from '@/features/roster/patterns/resolve';
import { toast } from '@/hooks/use-toast';

describe('Pattern-Locked Generation Guardrails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks generation when all staff lack patterns', async () => {
    // Mock: no patterns resolved
    vi.mocked(resolvePatternsBatch).mockResolvedValue(new Map());

    const input: PatternLockedInput = {
      startDate: '2025-01-01',
      endDate: '2025-01-07',
      staffIds: ['staff-1', 'staff-2'],
      tenantId: 'tenant-123',
      framework: '12h',
    };

    const result = await generatePatternLockedDuties(input);

    // Should abort generation
    expect(result.duties).toHaveLength(0);
    expect(result.staffWithoutPatterns).toEqual(['staff-1', 'staff-2']);
    expect(result.warnings).toContain('Generation aborted: Pattern-locked mode requires all staff to have patterns');

    // Should show destructive toast
    const toastCall = vi.mocked(toast).mock.calls[0];
    expect(toastCall[0]).toMatchObject({
      title: expect.stringContaining('Generation Blocked'),
      variant: 'destructive',
    });
  });

  it('blocks generation when some staff lack patterns', async () => {
    // Mock: only staff-1 has a pattern
    const mockTemplate = {
      id: 'pattern-1',
      tenant_id: 'tenant-123',
      site_id: null,
      pattern_name: '4 on 4 off',
      pattern_sequence: ['D', 'D', 'N', 'N', 'R', 'R', 'R', 'R'] as ShiftCode[],
      pattern_length: 8,
    };

    vi.mocked(resolvePatternsBatch).mockResolvedValue(
      new Map([
        ['staff-1', {
          template: mockTemplate,
          binding: {
            staff_id: 'staff-1',
            pattern_id: 'pattern-1',
            pattern_start_date: '2025-01-01',
          },
        }],
        // staff-2 missing
      ])
    );

    const input: PatternLockedInput = {
      startDate: '2025-01-01',
      endDate: '2025-01-07',
      staffIds: ['staff-1', 'staff-2'],
      tenantId: 'tenant-123',
      framework: '12h',
    };

    const result = await generatePatternLockedDuties(input);

    // Should abort generation
    expect(result.duties).toHaveLength(0);
    expect(result.staffWithPatterns).toEqual(['staff-1']);
    expect(result.staffWithoutPatterns).toEqual(['staff-2']);

    // Should show toast with missing staff names
    const toastCall = vi.mocked(toast).mock.calls[0];
    expect(toastCall[0]).toMatchObject({
      title: expect.stringContaining('Generation Blocked'),
      description: expect.stringContaining('Jane Smith'), // Staff name from mock
      variant: 'destructive',
    });
  });

  it('shows limited list when many staff lack patterns', async () => {
    // Mock: no patterns for 10 staff
    vi.mocked(resolvePatternsBatch).mockResolvedValue(new Map());

    const manyStaffIds = Array.from({ length: 10 }, (_, i) => `staff-${i + 1}`);

    const input: PatternLockedInput = {
      startDate: '2025-01-01',
      endDate: '2025-01-07',
      staffIds: manyStaffIds,
      tenantId: 'tenant-123',
      framework: '12h',
    };

    const result = await generatePatternLockedDuties(input);

    // Should abort generation
    expect(result.duties).toHaveLength(0);
    expect(result.staffWithoutPatterns).toHaveLength(10);

    // Should show toast with "(+5 more)" indicator
    const toastCall = vi.mocked(toast).mock.calls[0];
    expect(toastCall[0]?.description).toContain('(+5 more)');
  });

  it('includes navigation hint to manage patterns', async () => {
    vi.mocked(resolvePatternsBatch).mockResolvedValue(new Map());

    const input: PatternLockedInput = {
      startDate: '2025-01-01',
      endDate: '2025-01-07',
      staffIds: ['staff-1'],
      tenantId: 'tenant-123',
      framework: '12h',
    };

    await generatePatternLockedDuties(input);

    // Should provide destructive toast with guidance
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Generation Blocked'),
        description: expect.stringContaining('Missing for:'),
        variant: 'destructive',
      })
    );
  });

  it('proceeds when all staff have patterns', async () => {
    const mockTemplate = {
      id: 'pattern-1',
      tenant_id: 'tenant-123',
      site_id: null,
      pattern_name: '4 on 4 off',
      pattern_sequence: ['D', 'D', 'N', 'N', 'R', 'R', 'R', 'R'] as ShiftCode[],
      pattern_length: 8,
    };

    vi.mocked(resolvePatternsBatch).mockResolvedValue(
      new Map([
        ['staff-1', {
          template: mockTemplate,
          binding: {
            staff_id: 'staff-1',
            pattern_id: 'pattern-1',
            pattern_start_date: '2025-01-01',
          },
        }],
        ['staff-2', {
          template: mockTemplate,
          binding: {
            staff_id: 'staff-2',
            pattern_id: 'pattern-1',
            pattern_start_date: '2025-01-01',
          },
        }],
      ])
    );

    const input: PatternLockedInput = {
      startDate: '2025-01-01',
      endDate: '2025-01-07',
      staffIds: ['staff-1', 'staff-2'],
      tenantId: 'tenant-123',
      framework: '12h',
    };

    const result = await generatePatternLockedDuties(input);

    // Should NOT abort - staffWithoutPatterns should be empty
    expect(result.staffWithoutPatterns).toHaveLength(0);
    expect(result.staffWithPatterns).toHaveLength(2);

    // Should NOT show blocking toast
    const toastCalls = vi.mocked(toast).mock.calls;
    const blockingToasts = toastCalls.filter(call => 
      call[0]?.title?.includes('Generation Blocked')
    );
    expect(blockingToasts).toHaveLength(0);
  });
});
