
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/utils/errorLogger';

const logger = createLogger('useReportsData');

interface ReportsData {
  totalCost: number;
  budgetVariance: number;
  totalAssignments: number;
  averageHoursPerWeek: number;
  complianceScore: number;
  overtimeHours: number;
}

export function useReportsData() {
  const [data, setData] = useState<ReportsData>({
    totalCost: 0,
    budgetVariance: 0,
    totalAssignments: 0,
    averageHoursPerWeek: 0,
    complianceScore: 94,
    overtimeHours: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReportsData = async () => {
    try {
      logger.info('Fetching reports data...');
      setLoading(true);
      setError(null);

      // Get total assignments and cost for current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: assignments, error: assignmentsError } = await supabase
        .from('roster_assignments')
        .select('cost, hours, date')
        .gte('date', startOfMonth.toISOString().split('T')[0]);

      if (assignmentsError) {
        throw assignmentsError;
      }

      // Calculate statistics
      const totalCost = assignments?.reduce((sum, assignment) => sum + (assignment.cost || 0), 0) || 0;
      const totalHours = assignments?.reduce((sum, assignment) => sum + (assignment.hours || 0), 0) || 0;
      const totalAssignments = assignments?.length || 0;
      
      // Calculate average hours per week (assuming 4 weeks in a month)
      const averageHoursPerWeek = totalHours / 4;
      
      // Calculate overtime (hours over 40 per week)
      const overtimeHours = Math.max(0, averageHoursPerWeek - 40) * 4;

      // Get budget from site_settings
      const { data: siteSettings, error: budgetError } = await supabase
        .from('site_settings')
        .select('budget_warn_threshold')
        .single();
      
      if (budgetError) {
        throw new Error(`Budget RPC failed: ${budgetError.message}`);
      }
      
      const monthlyBudget = siteSettings?.budget_warn_threshold || 0;
      const budgetVariance = totalCost - monthlyBudget;

      setData({
        totalCost,
        budgetVariance,
        totalAssignments,
        averageHoursPerWeek,
        complianceScore: 0, // Remove mock - calculate from actual data if needed
        overtimeHours
      });

      logger.info('Reports data fetched successfully', {
        totalCost,
        totalAssignments,
        averageHoursPerWeek
      });
    } catch (error: any) {
      logger.error(new Error('Failed to fetch reports data'), { error });
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchReportsData
  };
}
