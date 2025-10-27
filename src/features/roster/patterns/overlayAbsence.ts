/**
 * Absence overlay - supersede pattern duties with approved leave/sick days
 * 
 * Loads approved absences and marks those days as 'R' with absence metadata,
 * preventing duty assignment on those dates.
 */

import { supabase } from '@/integrations/supabase/client';
import type { ExpandedPatternDay } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface AbsenceRecord {
  staffId: string;
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
  leaveType: string;    // 'annual', 'sick', 'unpaid', etc.
  status: string;       // 'approved', 'pending', 'rejected'
}

export interface ExpandedPatternDayWithAbsence extends ExpandedPatternDay {
  absence?: 'A';        // Marker for absence
  absenceType?: string; // Leave type if applicable
}

// ============================================================================
// LOAD ABSENCES
// ============================================================================

/**
 * Load approved absences for staff members within a date range
 */
export async function loadApprovedAbsences(
  staffIds: string[],
  startDate: string,
  endDate: string
): Promise<AbsenceRecord[]> {
  console.log('🚫 Loading approved absences:', {
    staffCount: staffIds.length,
    dateRange: `${startDate} to ${endDate}`,
  });

  if (staffIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .select('staff_id, start_date, end_date, leave_type, status')
    .in('staff_id', staffIds)
    .eq('status', 'approved')
    .lte('start_date', endDate)
    .gte('end_date', startDate);

  if (error) {
    console.error('❌ Error loading absences:', error);
    return [];
  }

  const absences: AbsenceRecord[] = (data || []).map(row => ({
    staffId: row.staff_id,
    startDate: row.start_date,
    endDate: row.end_date,
    leaveType: row.leave_type,
    status: row.status,
  }));

  console.log(`✓ Loaded ${absences.length} approved absence periods`);
  return absences;
}

// ============================================================================
// ABSENCE CHECKING
// ============================================================================

/**
 * Check if a date falls within an absence period
 */
function isDateInAbsence(
  date: string,
  absences: AbsenceRecord[]
): AbsenceRecord | null {
  for (const absence of absences) {
    if (date >= absence.startDate && date <= absence.endDate) {
      return absence;
    }
  }
  return null;
}

// ============================================================================
// OVERLAY ABSENCES ON PATTERNS
// ============================================================================

/**
 * Overlay approved absences onto expanded pattern days
 * 
 * For each day where staff has approved leave/absence:
 * - Force shift_code to 'R' (rest)
 * - Add absence metadata marker 'A'
 * - Store leave type for UI display
 * 
 * This ensures pattern duties are blocked on absence days.
 * 
 * @param expansions - Pattern expansions by staff ID
 * @param absences - Approved absence records
 * @returns Updated expansions with absence overlays
 */
export function overlayAbsencesOnPatterns(
  expansions: Map<string, ExpandedPatternDay[]>,
  absences: AbsenceRecord[]
): Map<string, ExpandedPatternDayWithAbsence[]> {
  console.log('🔄 Overlaying absences on pattern expansions');
  
  const result = new Map<string, ExpandedPatternDayWithAbsence[]>();
  let absenceDaysMarked = 0;

  for (const [staffId, days] of expansions.entries()) {
    // Filter absences for this staff member
    const staffAbsences = absences.filter(a => a.staffId === staffId);
    
    if (staffAbsences.length === 0) {
      // No absences - keep patterns as-is
      result.set(staffId, days);
      continue;
    }

    // Apply absence overlay
    const overlaidDays: ExpandedPatternDayWithAbsence[] = days.map(day => {
      const absence = isDateInAbsence(day.date, staffAbsences);
      
      if (absence) {
        absenceDaysMarked++;
        return {
          date: day.date,
          shift_code: 'R',        // Force rest
          is_rest: true,          // Mark as rest
          absence: 'A',           // Absence marker
          absenceType: absence.leaveType,
        };
      }

      return day;
    });

    result.set(staffId, overlaidDays);
  }

  console.log(`✅ Marked ${absenceDaysMarked} absence days across ${result.size} staff`);
  return result;
}

/**
 * Batch load absences and overlay on pattern expansions
 * 
 * Convenience function combining load + overlay steps
 */
export async function applyAbsenceOverlay(
  expansions: Map<string, ExpandedPatternDay[]>,
  startDate: string,
  endDate: string
): Promise<Map<string, ExpandedPatternDayWithAbsence[]>> {
  const staffIds = Array.from(expansions.keys());
  
  if (staffIds.length === 0) {
    return new Map();
  }

  const absences = await loadApprovedAbsences(staffIds, startDate, endDate);
  return overlayAbsencesOnPatterns(expansions, absences);
}
