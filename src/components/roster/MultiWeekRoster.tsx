
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface RosterAssignment {
  id: string;
  date: string;
  staff_id: string;
  shift_code: string;
  hours: number;
  cost: number;
  staff_profiles: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

interface WeekData {
  weekStart: Date;
  assignments: RosterAssignment[];
}

export function MultiWeekRoster() {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  useEffect(() => {
    fetchRosterData();
  }, [currentWeekOffset]);

  const fetchRosterData = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + (currentWeekOffset * 7));
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 28); // 4 weeks

      const { data, error } = await supabase
        .from('roster_assignments')
        .select(`
          *,
          staff_profiles!inner(first_name, last_name, employee_id)
        `)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date');

      if (error) {
        console.error('Error fetching roster data:', error);
        return;
      }

      // Group assignments by week
      const weekMap = new Map<string, RosterAssignment[]>();
      
      data?.forEach((assignment: any) => {
        const assignmentDate = new Date(assignment.date);
        const weekStart = new Date(assignmentDate);
        weekStart.setDate(assignmentDate.getDate() - assignmentDate.getDay() + 1); // Monday
        
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weekMap.has(weekKey)) {
          weekMap.set(weekKey, []);
        }
        
        weekMap.get(weekKey)?.push({
          id: assignment.id,
          date: assignment.date,
          staff_id: assignment.staff_id,
          shift_code: assignment.shift_code,
          hours: assignment.hours || 0,
          cost: assignment.cost || 0,
          staff_profiles: assignment.staff_profiles
        });
      });

      // Convert to array and sort by week start
      const weeksArray: WeekData[] = Array.from(weekMap.entries())
        .map(([weekKey, assignments]) => ({
          weekStart: new Date(weekKey),
          assignments
        }))
        .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

      setWeeks(weeksArray);
    } catch (error) {
      console.error('Error in fetchRosterData:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatWeekRange = (weekStart: Date) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
  };

  if (loading) {
    return <div>Loading multi-week roster...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Multi-Week Roster View
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setCurrentWeekOffset(currentWeekOffset - 4)}
            >
              Previous 4 Weeks
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setCurrentWeekOffset(currentWeekOffset + 4)}
            >
              Next 4 Weeks
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {weeks.length === 0 ? (
            <p className="text-gray-500">No roster data found for this period</p>
          ) : (
            weeks.map((week, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">
                  Week {index + 1}: {formatWeekRange(week.weekStart)}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {week.assignments.length === 0 ? (
                    <p className="text-gray-400 col-span-full">No assignments this week</p>
                  ) : (
                    week.assignments.map((assignment) => (
                      <div key={assignment.id} className="p-2 bg-gray-50 rounded">
                        <div className="font-medium text-sm">
                          {assignment.staff_profiles.first_name} {assignment.staff_profiles.last_name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {new Date(assignment.date).toLocaleDateString()} - {assignment.shift_code}
                        </div>
                        <div className="text-xs text-gray-500">
                          {assignment.hours}h - £{assignment.cost}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
