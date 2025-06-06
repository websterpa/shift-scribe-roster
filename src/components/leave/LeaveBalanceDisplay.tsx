
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LeaveBalanceDisplayProps {
  staffData?: {
    leave_allowance_days?: number;
    first_name?: string;
    last_name?: string;
  };
  usedDays: number;
}

export const LeaveBalanceDisplay: React.FC<LeaveBalanceDisplayProps> = ({
  staffData,
  usedDays
}) => {
  if (!staffData) return null;

  const allowanceDays = staffData.leave_allowance_days || 28;
  const remainingDays = Math.max(0, allowanceDays - usedDays);
  const utilizationPercentage = (usedDays / allowanceDays) * 100;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">
          Leave Balance - {staffData.first_name} {staffData.last_name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Annual Allowance:</span>
            <span className="font-medium">{allowanceDays} days</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Used This Year:</span>
            <span className="font-medium">{usedDays} days</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Remaining:</span>
            <span className={`font-medium ${remainingDays < 5 ? 'text-red-600' : 'text-green-600'}`}>
              {remainingDays} days
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className={`h-2 rounded-full ${utilizationPercentage > 90 ? 'bg-red-500' : utilizationPercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {utilizationPercentage.toFixed(1)}% utilized
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
