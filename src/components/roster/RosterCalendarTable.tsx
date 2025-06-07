
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

interface RosterCalendarTableProps {
  assignments: RosterAssignment[];
}

export const RosterCalendarTable = ({ assignments }: RosterCalendarTableProps) => {
  console.log('🔄 RosterCalendarTable component rendered with', assignments.length, 'assignments');

  // Get unique staff members and dates
  const staffMap = new Map<string, { name: string; role: string }>();
  const dateSet = new Set<string>();

  assignments.forEach(assignment => {
    if (assignment.staff_profiles) {
      const staffKey = `${assignment.staff_profiles.first_name} ${assignment.staff_profiles.last_name}`;
      staffMap.set(staffKey, {
        name: staffKey,
        role: assignment.staff_profiles.role || 'Staff'
      });
    }
    dateSet.add(assignment.date);
  });

  const staff = Array.from(staffMap.entries()).map(([name, data]) => ({ name, ...data }));
  const dates = Array.from(dateSet).sort();

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    return { day, weekday };
  };

  // Group dates by month for header
  const monthGroups = dates.reduce((acc, date) => {
    const monthYear = new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(date);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roster Calendar View</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-white border-r-2 min-w-[200px]">
                  <div className="font-semibold">Staff Member</div>
                  <div className="text-xs text-gray-500">Role</div>
                </TableHead>
                {dates.map((date) => {
                  const { day, weekday } = formatDate(date);
                  return (
                    <TableHead key={date} className="text-center min-w-[60px] border-l">
                      <div className="font-semibold">{weekday}</div>
                      <div className="text-lg">{day}</div>
                    </TableHead>
                  );
                })}
                <TableHead className="text-center border-l-2 min-w-[80px]">
                  <div className="font-semibold">Total</div>
                  <div className="text-xs">Hours</div>
                </TableHead>
                <TableHead className="text-center min-w-[100px]">
                  <div className="font-semibold">Total</div>
                  <div className="text-xs">Cost (£)</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((staffMember) => {
                const staffAssignments = assignmentMap.get(staffMember.name);
                const totalHours = dates.reduce((sum, date) => {
                  const assignment = staffAssignments?.get(date);
                  return sum + (assignment?.hours || 0);
                }, 0);
                const totalCost = dates.reduce((sum, date) => {
                  const assignment = staffAssignments?.get(date);
                  return sum + (assignment?.cost || 0);
                }, 0);

                return (
                  <TableRow key={staffMember.name} className="hover:bg-gray-50">
                    <TableCell className="sticky left-0 bg-white border-r-2">
                      <div className="font-medium">{staffMember.name}</div>
                      <div className="text-xs text-gray-500">{staffMember.role}</div>
                    </TableCell>
                    {dates.map((date) => {
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
                      {totalHours}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      £{totalCost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {/* Shift Legend */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-3">Shift Type Legend</h4>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded flex items-center justify-center font-medium ${getShiftColor('D')}`}>D</div>
              <span>Day Shift</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded flex items-center justify-center font-medium ${getShiftColor('N')}`}>N</div>
              <span>Night Shift</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded flex items-center justify-center font-medium ${getShiftColor('L')}`}>L</div>
              <span>Late/Evening</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded flex items-center justify-center font-medium ${getShiftColor('R')}`}>R</div>
              <span>Rest Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded flex items-center justify-center font-medium ${getShiftColor('T')}`}>T</div>
              <span>Training</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded flex items-center justify-center font-medium ${getShiftColor('S')}`}>S</div>
              <span>Sick Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded flex items-center justify-center font-medium ${getShiftColor('AL')}`}>AL</div>
              <span>Annual Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded flex items-center justify-center font-medium ${getShiftColor('OT')}`}>OT</div>
              <span>Overtime</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded flex items-center justify-center font-medium ${getShiftColor('E')}`}>E</div>
              <span>Early</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
