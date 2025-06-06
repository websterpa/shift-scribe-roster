
import React from "react";

interface StaffOption {
  id: string;
  first_name: string;
  last_name: string;
  leave_taken_monthly: Record<string, number>;
}

interface LeaveSummaryProps {
  startDate: string;
  endDate: string;
  selectedStaffData?: StaffOption;
  calculateDaysBetween: (start: string, end: string) => number;
}

export function LeaveSummary({ 
  startDate, 
  endDate, 
  selectedStaffData, 
  calculateDaysBetween 
}: LeaveSummaryProps) {
  if (!startDate || !endDate) return null;

  return (
    <div className="p-3 bg-gray-50 rounded-md">
      <p className="text-sm text-gray-600">
        Days requested: {calculateDaysBetween(startDate, endDate)}
      </p>
      {selectedStaffData && (
        <p className="text-sm text-gray-600">
          Current month leave taken: {selectedStaffData.leave_taken_monthly[new Date().toISOString().slice(0, 7)] || 0} days
        </p>
      )}
    </div>
  );
}
