
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StaffPersonalRoster } from './StaffPersonalRoster';

interface Staff {
  id: string;
  name: string;
  role: string;
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

interface WeekData {
  weekStart: Date;
  assignments: RosterAssignment[];
}

interface MultiWeekData {
  weekStart: Date;
  assignments: RosterAssignment[];
}

interface RosterCalendarProps {
  week: WeekData;
  staff: Staff[];
}

export function RosterCalendar({ week, staff }: RosterCalendarProps) {
  const [loading, setLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [personalRosterOpen, setPersonalRosterOpen] = useState(false);
  const [allWeeksData, setAllWeeksData] = useState<MultiWeekData[]>([]);
  
  // Load all weeks data when a staff member is selected
  useEffect(() => {
    if (selectedStaff && personalRosterOpen) {
      loadAllWeeksData();
    }
  }, [selectedStaff, personalRosterOpen]);

  const loadAllWeeksData = async () => {
    try {
      setLoading(true);
      
      // Fetch the latest roster version
      const { data: latestVersion, error: versionError } = await supabase
        .from('roster_versions')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (versionError || !latestVersion) {
        console.error('Error fetching roster version:', versionError);
        return;
      }

      // Fetch all assignments for this version
      const { data: assignments, error: assignmentsError } = await supabase
        .from('roster_assignments')
        .select(`
          *,
          staff_profiles!inner(
            first_name,
            last_name,
            role
          )
        `)
        .eq('version_id', latestVersion.id);

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        return;
      }

      // Transform assignments into week data
      const weekMap = new Map<string, RosterAssignment[]>();

      assignments?.forEach((assignment: any) => {
        const assignmentDate = new Date(assignment.date);
        const weekStart = new Date(assignmentDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        const staffName = `${assignment.staff_profiles.first_name} ${assignment.staff_profiles.last_name}`;
        const role = assignment.staff_profiles.role || 'Staff';

        const rosterAssignment: RosterAssignment = {
          staffId: assignment.staff_id,
          staffName,
          role,
          date: assignmentDate,
          shiftCode: assignment.shift_code,
          shiftHours: assignment.hours || 8,
          shiftStart: assignment.shift_start ? new Date(assignment.shift_start).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }) : undefined,
          shiftEnd: assignment.shift_end ? new Date(assignment.shift_end).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }) : undefined,
        };

        if (!weekMap.has(weekKey)) {
          weekMap.set(weekKey, []);
        }
        weekMap.get(weekKey)!.push(rosterAssignment);
      });

      // Convert to weeks array and sort by date
      const weeksArray: MultiWeekData[] = Array.from(weekMap.entries())
        .map(([weekKey, assignments]) => ({
          weekStart: new Date(weekKey),
          assignments
        }))
        .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

      setAllWeeksData(weeksArray);
    } catch (error) {
      console.error('Error loading all weeks data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffClick = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setPersonalRosterOpen(true);
  };
  
  // Group assignments by day
  const dayMap = new Map<string, RosterAssignment[]>();
  week.assignments.forEach(assignment => {
    const dateKey = assignment.date.toISOString().split('T')[0];
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, []);
    }
    dayMap.get(dateKey)?.push(assignment);
  });

  // Create an array of dates for the week
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(week.weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  function getShiftColor(shiftCode: string): string {
    switch (shiftCode) {
      case 'D': return 'bg-blue-100 text-blue-800';
      case 'E': return 'bg-purple-100 text-purple-800';
      case 'N': return 'bg-indigo-100 text-indigo-800';
      case 'R': return 'bg-gray-100 text-gray-800';
      case 'S': return 'bg-red-100 text-red-800';
      case 'L': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 border bg-gray-100">Staff</th>
              {weekDates.map((date) => (
                <th key={date.toISOString()} className="p-2 border bg-gray-100 min-w-[100px]">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}<br/>
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map((staffMember) => (
              <tr key={staffMember.id}>
                <td className="p-2 border font-medium">
                  <button
                    onClick={() => handleStaffClick(staffMember)}
                    className="text-left hover:bg-blue-50 hover:text-blue-700 transition-colors rounded px-1 py-1 w-full"
                  >
                    {staffMember.name}
                    <div className="text-xs text-gray-500">{staffMember.role}</div>
                  </button>
                </td>
                {weekDates.map((date) => {
                  const dateKey = date.toISOString().split('T')[0];
                  const dayAssignments = dayMap.get(dateKey) || [];
                  const staffAssignment = dayAssignments.find(a => a.staffId === staffMember.id);
                  
                  return (
                    <td key={`${staffMember.id}-${dateKey}`} className="p-2 border text-center">
                      {staffAssignment ? (
                        <div className={`p-1 rounded ${getShiftColor(staffAssignment.shiftCode)}`}>
                          <div className="font-medium">{staffAssignment.shiftCode}</div>
                          <div className="text-xs">{staffAssignment.shiftHours}h</div>
                        </div>
                      ) : (
                        <div className="text-gray-400">-</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <StaffPersonalRoster
        open={personalRosterOpen}
        onOpenChange={setPersonalRosterOpen}
        staff={selectedStaff}
        weeks={allWeeksData}
      />
    </>
  );
}
