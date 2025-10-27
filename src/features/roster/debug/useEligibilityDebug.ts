import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { StaffMember } from '@/types/roster';

export interface StaffEligibility {
  staffId: string;
  staffName: string;
  isEligible: boolean;
  reasonsExcluded: string[];
  details: {
    availabilityStatus: string;
    isActive: boolean;
    role: string;
    eligibleShifts: string[];
    hasLeaveInPeriod?: boolean;
  };
}

export interface EligibilityReport {
  totalStaff: number;
  eligibleCount: number;
  excludedCount: number;
  staffDetails: StaffEligibility[];
  exclusionReasons: Record<string, number>; // Reason -> count
}

/**
 * Hook to analyze staff eligibility for roster generation
 * Provides detailed reasons for why staff are included or excluded
 */
export function useEligibilityDebug(
  monthISO: string | null,
  shiftSystem: '8h' | '12h' = '8h'
) {
  const [report, setReport] = useState<EligibilityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!monthISO) return;
    
    analyzeEligibility();
  }, [monthISO, shiftSystem]);

  const analyzeEligibility = async () => {
    if (!monthISO) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('[ELIGIBILITY] Starting analysis for', monthISO, shiftSystem);
      
      // Fetch ALL staff members (no filters)
      const { data: allStaff, error: staffError } = await supabase
        .from('staff_profiles')
        .select('*')
        .order('last_name', { ascending: true });

      if (staffError) {
        throw new Error(`Failed to fetch staff: ${staffError.message}`);
      }

      console.log('[ELIGIBILITY] Total staff in database:', allStaff?.length || 0);

      // Fetch leave requests for the period
      const [year, month] = monthISO.split('-').map(Number);
      const startDate = `${monthISO}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month
      
      const { data: leaveRequests, error: leaveError } = await supabase
        .from('leave_requests')
        .select('staff_id, start_date, end_date, status')
        .eq('status', 'approved')
        .or(`start_date.gte.${startDate},end_date.lte.${endDate}`);

      if (leaveError) {
        console.warn('[ELIGIBILITY] Failed to fetch leave requests:', leaveError);
      }

      const leaveByStaff = new Map<string, boolean>();
      leaveRequests?.forEach(lr => {
        leaveByStaff.set(lr.staff_id, true);
      });

      // Analyze each staff member
      const staffDetails: StaffEligibility[] = [];
      const exclusionCounts: Record<string, number> = {};

      for (const staff of allStaff || []) {
        const reasons: string[] = [];
        const details = {
          availabilityStatus: staff.availability_status || 'unknown',
          isActive: staff.is_active ?? false,
          role: staff.role || 'unknown',
          eligibleShifts: staff.eligible_shifts || [],
          hasLeaveInPeriod: leaveByStaff.has(staff.id)
        };

        // Check 1: Availability status
        if (staff.availability_status !== 'active') {
          reasons.push(`Availability status: ${staff.availability_status || 'not set'}`);
        }

        // Check 2: Active flag (legacy check, less important now)
        if (staff.is_active === false) {
          reasons.push('Marked as inactive (is_active=false)');
        }

        // Check 3: Shift eligibility
        const hasShiftsConfigured = staff.eligible_shifts && staff.eligible_shifts.length > 0;
        if (!hasShiftsConfigured) {
          // This is actually OK now with permissive defaults
          // Just note it for visibility
          details.eligibleShifts = ['All shifts (default)'];
        } else {
          // Check if they have appropriate shifts for the system
          const requiredShifts = shiftSystem === '12h' ? ['Day', 'Night', 'D', 'N'] : ['Early', 'Late', 'Night', 'E', 'L', 'N'];
          const hasAnyRequired = staff.eligible_shifts.some(s => 
            requiredShifts.some(r => s === r || s.charAt(0) === r.charAt(0))
          );
          
          if (!hasAnyRequired) {
            reasons.push(`No eligible shifts for ${shiftSystem} system (has: ${staff.eligible_shifts.join(', ')})`);
          }
        }

        // Check 4: Leave in period
        if (details.hasLeaveInPeriod) {
          reasons.push(`Has approved leave in ${monthISO}`);
        }

        // Check 5: Shift worker status
        if (staff.is_shift_worker === false) {
          reasons.push('Not marked as shift worker');
        }

        // Count exclusion reasons
        reasons.forEach(reason => {
          exclusionCounts[reason] = (exclusionCounts[reason] || 0) + 1;
        });

        staffDetails.push({
          staffId: staff.id,
          staffName: `${staff.first_name} ${staff.last_name}`,
          isEligible: reasons.length === 0,
          reasonsExcluded: reasons,
          details
        });
      }

      const eligibleCount = staffDetails.filter(s => s.isEligible).length;
      const excludedCount = staffDetails.filter(s => !s.isEligible).length;

      const finalReport: EligibilityReport = {
        totalStaff: staffDetails.length,
        eligibleCount,
        excludedCount,
        staffDetails,
        exclusionReasons: exclusionCounts
      };

      console.log('[ELIGIBILITY] Analysis complete:', {
        total: finalReport.totalStaff,
        eligible: finalReport.eligibleCount,
        excluded: finalReport.excludedCount,
        topReasons: Object.entries(exclusionCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)
      });

      setReport(finalReport);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[ELIGIBILITY] Analysis failed:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return {
    report,
    loading,
    error,
    refresh: analyzeEligibility
  };
}
