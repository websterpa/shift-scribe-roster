/* Migrated from utils/roster; canonical version for engine2 integration */

import { supabase } from "@/integrations/supabase/client";
import { StaffMember } from "@/types/roster";
import { createLogger } from "@/utils/errorLogger";

const logger = createLogger('StaffUtilizationAnalysis');

export interface StaffUtilizationMetrics {
  staffId: string;
  staffName: string;
  minHoursPerWeek: number;
  actualHoursPerWeek: number;
  utilizationPercentage: number;
  hourlyDeficit: number;
  weeksAnalyzed: number;
  totalHoursWorked: number;
  totalMinimumRequired: number;
  status: 'underutilized' | 'optimal' | 'overutilized';
}

export interface UtilizationAnalysisReport {
  analysisDate: string;
  totalStaff: number;
  underutilizedStaff: number;
  optimallyUtilizedStaff: number;
  overutilizedStaff: number;
  totalHourDeficit: number;
  totalExcessHours: number;
  averageUtilization: number;
  staffMetrics: StaffUtilizationMetrics[];
  recommendations: string[];
}

/**
 * Analyzes staff utilization from roster assignments over a specified period
 */
export async function analyzeStaffUtilization(
  staffList: StaffMember[],
  startDate: Date,
  endDate: Date
): Promise<UtilizationAnalysisReport> {
  logger.info('Starting staff utilization analysis', {
    staffCount: staffList.length,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  });

  try {
    // Fetch roster assignments for the period
    const { data: assignments, error } = await supabase
      .from('roster_assignments')
      .select('staff_id, hours, date')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    if (error) {
      logger.error(new Error('Failed to fetch roster assignments'), { error });
      throw new Error(`Failed to fetch roster assignments: ${error.message}`);
    }

    logger.info(`Fetched ${assignments?.length || 0} roster assignments`);

    // Calculate weeks in analysis period
    const weeksAnalyzed = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    // Process each staff member
    const staffMetrics: StaffUtilizationMetrics[] = [];
    let totalHourDeficit = 0;
    let totalExcessHours = 0;

    for (const staff of staffList) {
      if (!staff.is_shift_worker) {
        continue; // Skip non-shift workers for this analysis
      }

      // Calculate actual hours worked by this staff member
      const staffAssignments = assignments?.filter(a => a.staff_id === staff.id) || [];
      const totalHoursWorked = staffAssignments.reduce((sum, assignment) => {
        return sum + (assignment.hours || 0);
      }, 0);

      // Calculate expected minimum hours
      const minHoursPerWeek = staff.min_hours_per_week || 37;
      const totalMinimumRequired = minHoursPerWeek * weeksAnalyzed;
      const actualHoursPerWeek = totalHoursWorked / weeksAnalyzed;
      
      // Calculate metrics
      const utilizationPercentage = totalMinimumRequired > 0 
        ? (totalHoursWorked / totalMinimumRequired) * 100 
        : 0;
      
      const hourlyDeficit = Math.max(0, totalMinimumRequired - totalHoursWorked);
      const excessHours = Math.max(0, totalHoursWorked - totalMinimumRequired);

      // Determine status
      let status: 'underutilized' | 'optimal' | 'overutilized';
      if (utilizationPercentage < 95) {
        status = 'underutilized';
        totalHourDeficit += hourlyDeficit;
      } else if (utilizationPercentage > 110) {
        status = 'overutilized';
        totalExcessHours += excessHours;
      } else {
        status = 'optimal';
      }

      staffMetrics.push({
        staffId: staff.id,
        staffName: staff.name || `${staff.first_name} ${staff.last_name}`,
        minHoursPerWeek,
        actualHoursPerWeek,
        utilizationPercentage,
        hourlyDeficit,
        weeksAnalyzed,
        totalHoursWorked,
        totalMinimumRequired,
        status
      });

      logger.info(`Staff analysis complete: ${staff.name}`, {
        totalHoursWorked,
        totalMinimumRequired,
        utilizationPercentage: utilizationPercentage.toFixed(1)
      });
    }

    // Calculate summary statistics
    const underutilizedStaff = staffMetrics.filter(s => s.status === 'underutilized').length;
    const optimallyUtilizedStaff = staffMetrics.filter(s => s.status === 'optimal').length;
    const overutilizedStaff = staffMetrics.filter(s => s.status === 'overutilized').length;
    const averageUtilization = staffMetrics.length > 0 
      ? staffMetrics.reduce((sum, s) => sum + s.utilizationPercentage, 0) / staffMetrics.length 
      : 0;

    // Generate recommendations
    const recommendations = generateRecommendations(staffMetrics, {
      underutilizedStaff,
      totalHourDeficit,
      totalExcessHours,
      averageUtilization
    });

    const report: UtilizationAnalysisReport = {
      analysisDate: new Date().toISOString(),
      totalStaff: staffMetrics.length,
      underutilizedStaff,
      optimallyUtilizedStaff,
      overutilizedStaff,
      totalHourDeficit,
      totalExcessHours,
      averageUtilization,
      staffMetrics,
      recommendations
    };

    logger.info('Staff utilization analysis completed', {
      totalStaff: report.totalStaff,
      underutilizedStaff: report.underutilizedStaff,
      averageUtilization: report.averageUtilization.toFixed(1)
    });

    return report;
  } catch (error) {
    logger.error(new Error('Exception in analyzeStaffUtilization'), { originalError: error });
    throw error;
  }
}

/**
 * Generates actionable recommendations based on utilization analysis
 */
function generateRecommendations(
  staffMetrics: StaffUtilizationMetrics[],
  summary: {
    underutilizedStaff: number;
    totalHourDeficit: number;
    totalExcessHours: number;
    averageUtilization: number;
  }
): string[] {
  const recommendations: string[] = [];

  // Check for severe underutilization
  if (summary.underutilizedStaff > 0) {
    const severelyUnderutilized = staffMetrics.filter(s => s.utilizationPercentage < 80).length;
    if (severelyUnderutilized > 0) {
      recommendations.push(`${severelyUnderutilized} staff members are severely underutilized (<80%). Consider increasing shift assignments or reviewing minimum hour requirements.`);
    }
    
    recommendations.push(`${summary.underutilizedStaff} staff members are not meeting minimum hours. Total deficit: ${summary.totalHourDeficit.toFixed(1)} hours.`);
  }

  // Check for overutilization
  if (summary.totalExcessHours > 0) {
    recommendations.push(`Some staff are working significantly above minimum hours. Consider redistributing ${summary.totalExcessHours.toFixed(1)} excess hours to underutilized staff.`);
  }

  // Overall utilization assessment
  if (summary.averageUtilization < 90) {
    recommendations.push('Overall staff utilization is low. Consider reducing staff count or increasing operational hours.');
  } else if (summary.averageUtilization > 120) {
    recommendations.push('Staff are working well above minimum requirements. Consider hiring additional staff or reducing operational demands.');
  }

  // Specific staffing recommendations
  const criticalStaff = staffMetrics.filter(s => s.utilizationPercentage < 70);
  if (criticalStaff.length > 0) {
    recommendations.push(`Critical attention needed for ${criticalStaff.length} staff members with extremely low utilization.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Staff utilization appears well-balanced. Continue monitoring for consistency.');
  }

  return recommendations;
}

/**
 * Calculates projected utilization for a proposed roster configuration
 */
export function calculateProjectedUtilization(
  staffList: StaffMember[],
  proposedShiftsPerWeek: Record<string, number>,
  averageHoursPerShift: number
): StaffUtilizationMetrics[] {
  logger.info('Calculating projected utilization for proposed configuration');

  return staffList
    .filter(staff => staff.is_shift_worker)
    .map(staff => {
      const shiftsPerWeek = proposedShiftsPerWeek[staff.id] || 0;
      const actualHoursPerWeek = shiftsPerWeek * averageHoursPerShift;
      const minHoursPerWeek = staff.min_hours_per_week || 37;
      const utilizationPercentage = minHoursPerWeek > 0 
        ? (actualHoursPerWeek / minHoursPerWeek) * 100 
        : 0;

      const hourlyDeficit = Math.max(0, minHoursPerWeek - actualHoursPerWeek);
      
      let status: 'underutilized' | 'optimal' | 'overutilized';
      if (utilizationPercentage < 95) {
        status = 'underutilized';
      } else if (utilizationPercentage > 110) {
        status = 'overutilized';
      } else {
        status = 'optimal';
      }

      return {
        staffId: staff.id,
        staffName: staff.name || `${staff.first_name} ${staff.last_name}`,
        minHoursPerWeek,
        actualHoursPerWeek,
        utilizationPercentage,
        hourlyDeficit,
        weeksAnalyzed: 1, // Projected for 1 week
        totalHoursWorked: actualHoursPerWeek,
        totalMinimumRequired: minHoursPerWeek,
        status
      };
    });
}
