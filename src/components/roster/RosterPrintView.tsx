
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';

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

interface RosterData {
  id: string;
  version_name: string;
  version_number: number;
  generated_at: string;
  config: {
    config_name: string;
    shift_type: string;
    cycle_length_weeks: number;
    start_date: string;
    staffing_requirements?: {
      day_shift_staff?: number;
      night_shift_staff?: number;
      early_shift_staff?: number;
      late_shift_staff?: number;
    };
  } | null;
  assignments: RosterAssignment[];
}

interface RosterPrintViewProps {
  rosterData: RosterData;
  onPrint: () => void;
  onDownload: () => void;
}

export const RosterPrintView = ({ rosterData, onPrint, onDownload }: RosterPrintViewProps) => {
  const getShiftName = (code: string) => {
    switch (code) {
      case 'E': return 'Early';
      case 'L': return 'Late';
      case 'N': return 'Night';
      case 'D': return 'Day';
      case 'R': return 'Rest';
      default: return code;
    }
  };

  const getShiftColor = (code: string) => {
    switch (code) {
      case 'E': return 'bg-blue-100 text-blue-800 print:bg-blue-50';
      case 'L': return 'bg-green-100 text-green-800 print:bg-green-50';
      case 'N': return 'bg-purple-100 text-purple-800 print:bg-purple-50';
      case 'D': return 'bg-yellow-100 text-yellow-800 print:bg-yellow-50';
      case 'R': return 'bg-gray-100 text-gray-800 print:bg-gray-50';
      default: return 'bg-gray-100 text-gray-800 print:bg-gray-50';
    }
  };

  // Group assignments by week
  const weeklyAssignments = rosterData.assignments.reduce((acc, assignment) => {
    const date = new Date(assignment.date);
    const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!acc[weekKey]) {
      acc[weekKey] = [];
    }
    acc[weekKey].push(assignment);
    return acc;
  }, {} as Record<string, RosterAssignment[]>);

  const weeks = Object.keys(weeklyAssignments).sort();

  // Get unique staff members
  const staffMap = new Map<string, { name: string; role: string }>();
  rosterData.assignments.forEach(assignment => {
    if (assignment.staff_profiles) {
      const staffKey = `${assignment.staff_profiles.first_name} ${assignment.staff_profiles.last_name}`;
      staffMap.set(staffKey, {
        name: staffKey,
        role: assignment.staff_profiles.role || 'Staff'
      });
    }
  });
  const staff = Array.from(staffMap.values());

  return (
    <div className="space-y-6">
      {/* Print/Download Controls - Hidden when printing */}
      <div className="flex gap-2 print:hidden">
        <Button onClick={onPrint} variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          Print Roster
        </Button>
        <Button onClick={onDownload} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Print-friendly content */}
      <div className="print:text-black print:bg-white">
        {/* Header */}
        <div className="mb-6 print:mb-4">
          <h1 className="text-2xl font-bold print:text-xl">{rosterData.version_name}</h1>
          <div className="text-sm text-gray-600 print:text-gray-800 mt-2">
            <p><strong>Configuration:</strong> {rosterData.config?.config_name}</p>
            <p><strong>Shift Type:</strong> {rosterData.config?.shift_type}</p>
            <p><strong>Cycle Length:</strong> {rosterData.config?.cycle_length_weeks} weeks</p>
            <p><strong>Generated:</strong> {new Date(rosterData.generated_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Staffing Requirements */}
        {rosterData.config?.staffing_requirements && (
          <Card className="mb-6 print:mb-4 print:shadow-none print:border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg print:text-base">Configured Staffing Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {rosterData.config.shift_type === '12h' ? (
                  <>
                    <div>
                      <span className="font-medium">Day Shift:</span> {rosterData.config.staffing_requirements.day_shift_staff || 2} staff
                    </div>
                    <div>
                      <span className="font-medium">Night Shift:</span> {rosterData.config.staffing_requirements.night_shift_staff || 2} staff
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="font-medium">Early Shift:</span> {rosterData.config.staffing_requirements.early_shift_staff || 2} staff
                    </div>
                    <div>
                      <span className="font-medium">Late Shift:</span> {rosterData.config.staffing_requirements.late_shift_staff || 2} staff
                    </div>
                    <div>
                      <span className="font-medium">Night Shift:</span> {rosterData.config.staffing_requirements.night_shift_staff || 2} staff
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weekly Roster Tables */}
        {weeks.map((weekKey, weekIndex) => {
          const weekAssignments = weeklyAssignments[weekKey];
          const weekStart = new Date(weekKey);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);

          // Create assignment lookup map: staffName -> date -> assignment
          const assignmentMap = new Map<string, Map<string, RosterAssignment>>();
          weekAssignments.forEach(assignment => {
            if (assignment.staff_profiles) {
              const staffName = `${assignment.staff_profiles.first_name} ${assignment.staff_profiles.last_name}`;
              if (!assignmentMap.has(staffName)) {
                assignmentMap.set(staffName, new Map());
              }
              assignmentMap.get(staffName)!.set(assignment.date, assignment);
            }
          });

          // Generate week dates
          const weekDates: string[] = [];
          for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            weekDates.push(date.toISOString().split('T')[0]);
          }

          return (
            <Card key={weekKey} className="print:shadow-none print:border print:break-inside-avoid">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg print:text-base">
                  Week {weekIndex + 1}: {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 border print:border-gray-400">Staff Member</th>
                        {weekDates.map((date) => {
                          const dateObj = new Date(date);
                          return (
                            <th key={date} className="text-center p-2 border print:border-gray-400 min-w-[80px]">
                              <div>{dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                              <div className="text-xs">{dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                            </th>
                          );
                        })}
                        <th className="text-right p-2 border print:border-gray-400">Hours</th>
                        <th className="text-right p-2 border print:border-gray-400">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((staffMember) => {
                        const staffAssignments = assignmentMap.get(staffMember.name);
                        const weekHours = weekDates.reduce((sum, date) => {
                          const assignment = staffAssignments?.get(date);
                          return sum + (assignment?.hours || 0);
                        }, 0);
                        const weekCost = weekDates.reduce((sum, date) => {
                          const assignment = staffAssignments?.get(date);
                          return sum + (assignment?.cost || 0);
                        }, 0);

                        return (
                          <tr key={staffMember.name} className="border-b print:break-inside-avoid">
                            <td className="p-2 border print:border-gray-400">
                              <div className="font-medium">{staffMember.name}</div>
                              <div className="text-xs text-gray-500 print:text-gray-700">{staffMember.role}</div>
                            </td>
                            {weekDates.map((date) => {
                              const assignment = staffAssignments?.get(date);
                              return (
                                <td key={`${staffMember.name}-${date}`} className="p-2 border print:border-gray-400 text-center">
                                  {assignment ? (
                                    <div className={`p-1 rounded text-xs font-medium ${getShiftColor(assignment.shift_code)}`}>
                                      {assignment.shift_code}
                                    </div>
                                  ) : (
                                    <div className="text-gray-400 print:text-gray-600">-</div>
                                  )}
                                </td>
                              );
                            })}
                            <td className="p-2 border print:border-gray-400 text-right font-medium">{weekHours}h</td>
                            <td className="p-2 border print:border-gray-400 text-right font-medium">£{weekCost.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Shift Legend */}
        <Card className="mt-6 print:shadow-none print:border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg print:text-base">Shift Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${getShiftColor('E')}`}></div>
                <span>E - Early Shift</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${getShiftColor('L')}`}></div>
                <span>L - Late Shift</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${getShiftColor('N')}`}></div>
                <span>N - Night Shift</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${getShiftColor('D')}`}></div>
                <span>D - Day Shift</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${getShiftColor('R')}`}></div>
                <span>R - Rest Day</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
