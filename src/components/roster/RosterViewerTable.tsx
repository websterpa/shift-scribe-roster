
import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Calendar } from 'lucide-react';

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

interface RosterViewerTableProps {
  assignments: RosterAssignment[];
}

export const RosterViewerTable = ({ assignments }: RosterViewerTableProps) => {
  console.log('🔄 RosterViewerTable component rendered with', assignments.length, 'assignments');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');

  const getShiftName = (code: string) => {
    switch (code) {
      case 'E': return 'Early';
      case 'L': return 'Late';
      case 'N': return 'Night';
      case 'D': return 'Day';
      default: return code;
    }
  };

  const getShiftColor = (code: string) => {
    switch (code) {
      case 'E': return 'bg-blue-100 text-blue-800';
      case 'L': return 'bg-green-100 text-green-800';
      case 'N': return 'bg-purple-100 text-purple-800';
      case 'D': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter assignments based on search term
  const filteredAssignments = assignments.filter(assignment => {
    const staffName = `${assignment.staff_profiles?.first_name || ''} ${assignment.staff_profiles?.last_name || ''}`.toLowerCase();
    const role = assignment.staff_profiles?.role?.toLowerCase() || '';
    const shiftName = getShiftName(assignment.shift_code).toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return staffName.includes(searchLower) || 
           role.includes(searchLower) || 
           shiftName.includes(searchLower) ||
           assignment.date.includes(searchLower);
  });

  // Group assignments by week
  const weeklyAssignments = filteredAssignments.reduce((acc, assignment) => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Roster Assignments ({filteredAssignments.length})
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search staff, role, or shift..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredAssignments.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
            <p className="text-gray-500">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {weeks.map(weekKey => {
              const weekAssignments = weeklyAssignments[weekKey];
              const weekStart = new Date(weekKey);
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekEnd.getDate() + 6);
              
              return (
                <div key={weekKey} className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">
                    Week of {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium">Date</th>
                          <th className="text-left py-2 px-3 font-medium">Staff Member</th>
                          <th className="text-left py-2 px-3 font-medium">Role</th>
                          <th className="text-left py-2 px-3 font-medium">Shift</th>
                          <th className="text-left py-2 px-3 font-medium">Time</th>
                          <th className="text-left py-2 px-3 font-medium">Hours</th>
                          <th className="text-right py-2 px-3 font-medium">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weekAssignments
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                          .map((assignment) => (
                          <tr key={assignment.id} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3">
                              {new Date(assignment.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-medium">
                                {assignment.staff_profiles?.first_name} {assignment.staff_profiles?.last_name}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-sm text-gray-600">
                                {assignment.staff_profiles?.role || 'Staff'}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getShiftColor(assignment.shift_code)}`}>
                                {getShiftName(assignment.shift_code)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-sm">
                              {assignment.shift_start && assignment.shift_end ? (
                                `${assignment.shift_start} - ${assignment.shift_end}`
                              ) : (
                                'Not specified'
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {assignment.hours || 0}h
                            </td>
                            <td className="py-2 px-3 text-right font-medium">
                              £{(assignment.cost || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
