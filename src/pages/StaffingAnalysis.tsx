
import React from 'react';
import { StaffUtilizationDashboard } from '@/components/roster/StaffUtilizationDashboard';

const StaffingAnalysis = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staffing Analysis</h1>
          <p className="text-muted-foreground">
            Analyze staff utilization patterns and identify optimization opportunities
          </p>
        </div>
      </div>
      <StaffUtilizationDashboard />
    </div>
  );
};

export default StaffingAnalysis;
