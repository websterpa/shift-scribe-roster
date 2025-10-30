
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { WTDComplianceIndicator } from './WTDComplianceIndicator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

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
  staffViolations?: Map<string, { gap: number; message: string }>;
  weekHours: number;
  weekCost: number;
  heatmapEnabled?: boolean;
  complianceScore?: number;
}

export const RosterStaffRow = ({
  staffMember,
  currentWeekDates,
  staffAssignments,
  staffViolations,
  weekHours,
  weekCost,
  heatmapEnabled = false,
  complianceScore = 100
}: RosterStaffRowProps) => {
  const getShiftColor = (shiftCode: string, hasViolation: boolean) => {
    // If heatmap is enabled, use compliance-based coloring
    if (heatmapEnabled) {
      if (complianceScore >= 100) {
        return 'bg-green-100 text-green-900 border-green-300';
      } else if (complianceScore >= 80) {
        return 'bg-amber-100 text-amber-900 border-amber-300';
      } else {
        return 'bg-red-100 text-red-900 border-red-300';
      }
    }
    
    // If there's a violation, use red highlighting
    if (hasViolation) {
      return 'bg-red-100 text-red-900 border-red-300 shadow-sm';
    }
    
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
        const violation = staffViolations?.get(date);
        const hasViolation = !!violation;
        
        return (
          <TableCell key={`${staffMember.name}-${date}`} className="text-center p-1 border-l">
            {assignment ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded text-xs font-medium border ${getShiftColor(assignment.shift_code, hasViolation)} relative`}>
                      {assignment.shift_code}
                      {hasViolation && (
                        <AlertTriangle 
                          className="absolute -top-1 -right-1 text-red-600" 
                          size={14}
                        />
                      )}
                    </div>
                  </TooltipTrigger>
                  {hasViolation && violation && (
                    <TooltipContent className="bg-destructive text-destructive-foreground">
                      <div className="space-y-1">
                        <p className="font-semibold flex items-center gap-1">
                          <AlertTriangle size={14} />
                          WTD Rest Violation
                        </p>
                        <p className="text-sm">Only {violation.gap.toFixed(1)}h rest</p>
                        <p className="text-xs opacity-90">{violation.message}</p>
                      </div>
                    </TooltipContent>
                  )}
                  {!hasViolation && (
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">{assignment.shift_code} Shift</p>
                        <p className="text-xs">{date}</p>
                        {assignment.hours && (
                          <p className="text-xs">{assignment.hours}h</p>
                        )}
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className="inline-flex items-center justify-center w-10 h-10 rounded text-xs text-gray-400">
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
