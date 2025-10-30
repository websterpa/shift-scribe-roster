/**
 * @nights @persist
 * Tests for roster_assignments upsert idempotency
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

describe('Roster Assignments Upsert Idempotency', () => {
  const testVersionId = 'test-version-' + Date.now();
  const testStaffId = 'test-staff-' + Date.now();
  const testDate = '2025-01-15';

  beforeEach(async () => {
    // Clean up test data
    await supabase
      .from('roster_assignments')
      .delete()
      .eq('version_id', testVersionId);
  });

  it('should not duplicate assignments on repeated upsert with same key', async () => {
    const assignment1 = {
      version_id: testVersionId,
      tenant_id: DEMO_TENANT_ID,
      date: testDate,
      staff_id: testStaffId,
      shift_code: 'E',
      hours: 8,
      cost: 144
    };

    // First insert
    const { error: error1 } = await supabase
      .from('roster_assignments')
      .upsert([assignment1], {
        onConflict: 'version_id,date,staff_id'
      });

    expect(error1).toBeNull();

    // Count rows
    const { data: rows1, error: countError1 } = await supabase
      .from('roster_assignments')
      .select('*')
      .eq('version_id', testVersionId)
      .eq('date', testDate)
      .eq('staff_id', testStaffId);

    expect(countError1).toBeNull();
    expect(rows1).toHaveLength(1);
    expect(rows1![0].shift_code).toBe('E');

    // Second upsert with different shift_code (should update)
    const assignment2 = {
      ...assignment1,
      shift_code: 'N',
      hours: 12,
      cost: 288
    };

    const { error: error2 } = await supabase
      .from('roster_assignments')
      .upsert([assignment2], {
        onConflict: 'version_id,date,staff_id'
      });

    expect(error2).toBeNull();

    // Count rows again - should still be 1
    const { data: rows2, error: countError2 } = await supabase
      .from('roster_assignments')
      .select('*')
      .eq('version_id', testVersionId)
      .eq('date', testDate)
      .eq('staff_id', testStaffId);

    expect(countError2).toBeNull();
    expect(rows2).toHaveLength(1);
    expect(rows2![0].shift_code).toBe('N'); // Updated
    expect(rows2![0].hours).toBe(12); // Updated
  });

  it('should allow different staff on same date and version', async () => {
    const staff1Id = testStaffId + '-1';
    const staff2Id = testStaffId + '-2';

    const assignments = [
      {
        version_id: testVersionId,
        tenant_id: DEMO_TENANT_ID,
        date: testDate,
        staff_id: staff1Id,
        shift_code: 'E',
        hours: 8
      },
      {
        version_id: testVersionId,
        tenant_id: DEMO_TENANT_ID,
        date: testDate,
        staff_id: staff2Id,
        shift_code: 'L',
        hours: 8
      }
    ];

    const { error } = await supabase
      .from('roster_assignments')
      .upsert(assignments, {
        onConflict: 'version_id,date,staff_id'
      });

    expect(error).toBeNull();

    // Should have 2 rows
    const { data: rows } = await supabase
      .from('roster_assignments')
      .select('*')
      .eq('version_id', testVersionId)
      .eq('date', testDate);

    expect(rows).toHaveLength(2);
  });

  it('should allow same staff on different dates', async () => {
    const assignments = [
      {
        version_id: testVersionId,
        tenant_id: DEMO_TENANT_ID,
        date: '2025-01-15',
        staff_id: testStaffId,
        shift_code: 'E',
        hours: 8
      },
      {
        version_id: testVersionId,
        tenant_id: DEMO_TENANT_ID,
        date: '2025-01-16',
        staff_id: testStaffId,
        shift_code: 'L',
        hours: 8
      }
    ];

    const { error } = await supabase
      .from('roster_assignments')
      .upsert(assignments, {
        onConflict: 'version_id,date,staff_id'
      });

    expect(error).toBeNull();

    // Should have 2 rows
    const { data: rows } = await supabase
      .from('roster_assignments')
      .select('*')
      .eq('version_id', testVersionId)
      .eq('staff_id', testStaffId);

    expect(rows).toHaveLength(2);
  });
});
