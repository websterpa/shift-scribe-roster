
import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Table, TableBody } from '@/components/ui/table';
import { RosterCalendarHeader } from './RosterCalendarHeader';
import { RosterStaffRow } from './RosterStaffRow';
import { RosterShiftLegend } from './RosterShiftLegend';
import { RosterWeekNavigation } from './RosterWeekNavigation';

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
    max_hours_per_week?: number;
    opted_out_wtd?: boolean;
  } | null;
}

interface RosterCalendarTableProps {
  assignments: RosterAssignment[];
  diagnostics?: {
    restViolations: Record<string, Array<{ day: string; gap: number; message: string }>>;
    weeklyAverageCompliant: Record<string, boolean>;
  };
}

export const RosterCalendarTable = ({ assignments, diagnostics }: RosterCalendarTableProps) => {
  console.log('🔄 RosterCalendarTable component rendered with', assignments.length, 'assignments');
  
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

  // Build violation map for quick lookup: staffName -> date -> violation
  const violationMap = new Map<string, Map<string, { gap: number; message: string }>>();
  
  if (diagnostics?.restViolations) {
    Object.entries(diagnostics.restViolations).forEach(([staffId, violations]) => {
      const staffViolationMap = new Map<string, { gap: number; message: string }>();
      violations.forEach(v => {
        staffViolationMap.set(v.day, { gap: v.gap, message: v.message });
      });
      violationMap.set(staffId, staffViolationMap);
    });
  }

  // Get unique staff members and dates
  const staffMap = new Map<string, { name: string; role: string; maxHours: number; optedOut: boolean }>();
  const dateSet = new Set<string>();

  assignments.forEach(assignment => {
    if (assignment.staff_profiles) {
      const staffKey = `${assignment.staff_profiles.first_name} ${assignment.staff_profiles.last_name}`;
      staffMap.set(staffKey, {
        name: staffKey,
        role: assignment.staff_profiles.role || 'Staff',
        maxHours: assignment.staff_profiles.max_hours_per_week || 48,
        optedOut: assignment.staff_profiles.opted_out_wtd || false
      });
    }
    dateSet.add(assignment.date);
  });

  const staff = Array.from(staffMap.entries()).map(([name, data]) => ({ name, ...data }));
  const allDates = Array.from(dateSet).sort();

  // Group dates into weeks (7 days each)
  const weeks: string[][] = [];
  let currentWeek: string[] = [];
  
  allDates.forEach((date, index) => {
    currentWeek.push(date);
    
    // If we have 7 days or it's the last date, complete the week
    if (currentWeek.length === 7 || index === allDates.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  console.log('📅 Calendar weeks breakdown:', {
    totalDates: allDates.length,
    totalWeeks: weeks.length,
    currentWeekIndex,
    datesInCurrentWeek: weeks[currentWeekIndex]?.length || 0
  });

  const currentWeekDates = weeks[currentWeekIndex] || [];

  // Create assignment lookup map: staffName -> date -> assignment
  const assignmentMap = new Map<string, Map<string, RosterAssignment>>();
  
  assignments.forEach(assignment => {
    if (assignment.staff_profiles) {
      const staffName = `${assignment.staff_profiles.first_name} ${assignment.staff_profiles.last_name}`;
      
      if (!assignmentMap.has(staffName)) {
        assignmentMap.set(staffName, new Map());
      }
      
      assignmentMap.get(staffName)!.set(assignment.date, assignment);
    }
  });

  const navigateToPreviousWeek = () => {
    if (currentWeekIndex > 0) {
      setCurrentWeekIndex(currentWeekIndex - 1);
    }
  };

  const navigateToNextWeek = () => {
    if (currentWeekIndex < weeks.length - 1) {
      setCurrentWeekIndex(currentWeekIndex + 1);
    }
  };

  return (
    <Card>
      <CardHeader>
        <RosterWeekNavigation
          currentWeekIndex={currentWeekIndex}
          totalWeeks={weeks.length}
          onPrevious={navigateToPreviousWeek}
          onNext={navigateToNextWeek}
          currentWeekDates={currentWeekDates}
        />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <RosterCalendarHeader currentWeekDates={currentWeekDates} />
            <TableBody>
              {staff.map((staffMember) => {
                const staffAssignments = assignmentMap.get(staffMember.name);
                const staffViolations = violationMap.get(staffMember.name);
                const weekHours = currentWeekDates.reduce((sum, date) => {
                  const assignment = staffAssignments?.get(date);
                  return sum + (assignment?.hours || 0);
                }, 0);
                const weekCost = currentWeekDates.reduce((sum, date) => {
                  const assignment = staffAssignments?.get(date);
                  return sum + (assignment?.cost || 0);
                }, 0);

                return (
                  <RosterStaffRow
                    key={staffMember.name}
                    staffMember={staffMember}
                    currentWeekDates={currentWeekDates}
                    staffAssignments={staffAssignments}
                    staffViolations={staffViolations}
                    weekHours={weekHours}
                    weekCost={weekCost}
                  />
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        <RosterShiftLegend />
      </CardContent>
    </Card>
  );
};
