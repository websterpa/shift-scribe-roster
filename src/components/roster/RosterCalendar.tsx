
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Assignment {
  id: string;
  shift_date: string;
  shift_type: string;
  shift_start: string | null;
  shift_end: string | null;
  staff_profiles: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

const RosterCalendar = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAssignments = async () => {
    try {
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);

      const { data, error } = await supabase
        .from('roster_assignments')
        .select(`
          *,
          staff_profiles:staff_id (
            first_name,
            last_name,
            employee_id
          )
        `)
        .gte('shift_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('shift_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('shift_date')
        .order('shift_type');

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load roster data",
          variant: "destructive",
        });
      } else {
        setAssignments(data || []);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [currentWeek]);

  const getShiftColor = (shiftType: string) => {
    switch (shiftType) {
      case 'day':
        return 'bg-yellow-100 text-yellow-800';
      case 'evening':
        return 'bg-orange-100 text-orange-800';
      case 'night':
        return 'bg-blue-100 text-blue-800';
      case 'off':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfWeek(currentWeek, { weekStartsOn: 1 }), i);
    return {
      date,
      dateString: format(date, 'yyyy-MM-dd'),
      dayName: format(date, 'EEEE'),
      dayNumber: format(date, 'd'),
    };
  });

  const getAssignmentsForDay = (dateString: string) => {
    return assignments.filter(assignment => assignment.shift_date === dateString);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading roster...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Weekly Roster</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium">
              Week of {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayAssignments = getAssignmentsForDay(day.dateString);
            return (
              <div key={day.dateString} className="border rounded-lg p-3 min-h-[200px]">
                <div className="font-semibold text-sm mb-2">
                  {day.dayName}
                  <div className="text-lg">{day.dayNumber}</div>
                </div>
                <div className="space-y-1">
                  {dayAssignments.map((assignment) => (
                    <div key={assignment.id} className="text-xs">
                      <Badge
                        variant="secondary"
                        className={`w-full justify-start ${getShiftColor(assignment.shift_type)}`}
                      >
                        <div className="flex flex-col w-full">
                          <span className="font-medium">
                            {assignment.shift_type.toUpperCase()}
                          </span>
                          <span>
                            {assignment.staff_profiles.first_name} {assignment.staff_profiles.last_name}
                          </span>
                          {assignment.shift_start && assignment.shift_end && (
                            <span>
                              {assignment.shift_start} - {assignment.shift_end}
                            </span>
                          )}
                        </div>
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default RosterCalendar;
