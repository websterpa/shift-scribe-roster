
import React from 'react';
import { RosterCalendar } from '@/components/roster/RosterCalendar';

// Define internal week data structure
interface MultiWeekData {
  weekStart: Date;
  assignments: RosterAssignment[];
}

interface RosterAssignment {
  staffId: string;
  staffName: string;
  role: string;
  date: Date;
  shiftCode: string;
  shiftHours: number;
  shiftStart?: string;
  shiftEnd?: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
}

interface RosterDisplayContainerProps {
  loading?: boolean;
  weeks?: MultiWeekData[];
  currentWeekOffset?: number;
  displayStaff?: Staff[];
}

export function RosterDisplayContainer({
  loading = false,
  weeks = [],
  currentWeekOffset = 0,
  displayStaff = []
}: RosterDisplayContainerProps) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary mx-auto"></div>
          <p className="text-sm text-gray-500">Loading roster preview...</p>
        </div>
      </div>
    );
  }

  if (weeks.length > 0 && currentWeekOffset < weeks.length) {
    return (
      <div className="overflow-x-auto">
        <RosterCalendar 
          week={weeks[currentWeekOffset]} 
          staff={displayStaff}
        />
      </div>
    );
  }

  return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-gray-500">No roster data available</p>
    </div>
  );
}
