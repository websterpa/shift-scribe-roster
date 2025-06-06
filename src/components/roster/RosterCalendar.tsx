
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Assignment {
  id: string;
  shift_date: string;
  staff_id: string;
  shift_code: string;
  shift_type: string;
  hours: number;
  cost: number;
  staff_profiles: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

export function RosterCalendar() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('roster_assignments')
        .select(`
          *,
          staff_profiles!inner(first_name, last_name, employee_id)
        `)
        .order('date');

      if (error) {
        console.error('Error fetching assignments:', error);
        return;
      }

      // Transform data to match Assignment interface
      const transformedData: Assignment[] = data?.map((item: any) => ({
        id: item.id,
        shift_date: item.date,
        staff_id: item.staff_id,
        shift_code: item.shift_code,
        shift_type: item.shift_code,
        hours: item.hours || 0,
        cost: item.cost || 0,
        staff_profiles: item.staff_profiles
      })) || [];

      setAssignments(transformedData);
    } catch (error) {
      console.error('Error in fetchAssignments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading roster calendar...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roster Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {assignments.length === 0 ? (
            <p className="text-gray-500">No roster assignments found</p>
          ) : (
            assignments.map((assignment) => (
              <div key={assignment.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    {assignment.staff_profiles.first_name} {assignment.staff_profiles.last_name}
                  </span>
                  <span className="text-sm text-gray-500">
                    {assignment.shift_date}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Shift: {assignment.shift_code} | Hours: {assignment.hours} | Cost: £{assignment.cost}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
