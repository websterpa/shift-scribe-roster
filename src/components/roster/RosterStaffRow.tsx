
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { WTDComplianceIndicator } from './WTDComplianceIndicator';

interface StaffMember {
  name: string;
  role: string;
  maxHours: number;
  optedOut: boolean;
}

interface RosterAssignment {
  id: string;
  date: string;
  shift_code: string;
  shift_start: string | null;
  shift_end: string | null;
  hours: number | null;
  cost: number | null;
  staff_profiles: {
    first_name: string;
    last_name: string;
    role: string | null;
  } | null;
}

interface RosterStaffRowProps {
  staffMember: StaffMember;
  currentWeekDates: string[];
  staffAssignments: Map<string, RosterAssignment> | undefined;
  weekHours: number;
  weekCost: number;
}

export const RosterStaffRow = ({
  staffMember,
  currentWeekDates,
  staffAssignments,
  weekHours,
  weekCost
}: RosterStaffRowProps) => {
  const getShiftColor = (shiftCode: string) => {
    switch (shiftCode) {
      case 'D': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'E': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'L': return 'bg-green-100 text-green-800 border-green-200';
      case 'N': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'R': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'S': return 'bg-red-100 text-red-800 border-red-200';
      case 'AL': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'T': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'OT': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-50 text-gray-500 border-gray-200';
    }
  };

  return (
    <TableRow key={staffMember.name} className="hover:bg-gray-50">
      <TableCell className="sticky left-0 bg-white border-r-2">
        <div className="space-y-1">
          <div className="font-medium">{staffMember.name}</div>
          <div className="text-xs text-gray-500">{staffMember.role}</div>
          <WTDComplianceIndicator
            weeklyHours={weekHours}
            maxHours={staffMember.maxHours}
            optedOut={staffMember.optedOut}
            className="mt-1"
          />
        </div>
      </TableCell>
      {currentWeekDates.map((date) => {
        const assignment = staffAssignments?.get(date);
        return (
          <TableCell key={`${staffMember.name}-${date}`} className="text-center p-1 border-l">
            {assignment ? (
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded text-xs font-medium border ${getShiftColor(assignment.shift_code)}`}>
                {assignment.shift_code}
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-8 h-8 rounded text-xs text-gray-400">
                -
              </div>
            )}
          </TableCell>
        );
      })}
      <TableCell className="text-center border-l-2 font-medium">
        {weekHours}
      </TableCell>
      <TableCell className="text-center font-medium">
        £{weekCost.toFixed(2)}
      </TableCell>
    </TableRow>
  );
};
