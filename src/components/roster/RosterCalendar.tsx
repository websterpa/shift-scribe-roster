
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

interface RosterCalendarProps {
  week: WeekData;
  staff: Staff[];
}

export function RosterCalendar({ week, staff }: RosterCalendarProps) {
  const [loading, setLoading] = useState(false);
  
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

  return (
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
                {staffMember.name}
                <div className="text-xs text-gray-500">{staffMember.role}</div>
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
  );
}

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
