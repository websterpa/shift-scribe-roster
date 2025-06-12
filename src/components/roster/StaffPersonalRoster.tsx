
import React from 'react';
import { format, addDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar, User, AlertTriangle } from 'lucide-react';

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

interface MultiWeekData {
  weekStart: Date;
  assignments: RosterAssignment[];
}

interface StaffPersonalRosterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: Staff | null;
  weeks: MultiWeekData[];
}

export function StaffPersonalRoster({ open, onOpenChange, staff, weeks }: StaffPersonalRosterProps) {
  if (!staff) return null;

  // Filter assignments for the selected staff member
  const staffAssignments = weeks.flatMap(week => 
    week.assignments.filter(assignment => assignment.staffId === staff.id)
  ).sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate weekly totals
  const weeklyTotals = weeks.map(week => {
    const weekAssignments = week.assignments.filter(assignment => assignment.staffId === staff.id);
    const totalHours = weekAssignments.reduce((sum, assignment) => sum + assignment.shiftHours, 0);
    return {
      weekStart: week.weekStart,
      totalHours,
      assignments: weekAssignments
    };
  });

  const totalHours = staffAssignments.reduce((sum, assignment) => sum + assignment.shiftHours, 0);
  const workingDays = staffAssignments.filter(assignment => assignment.shiftCode !== 'R').length;
  const averageHoursPerWeek = weeklyTotals.length > 0 ? totalHours / weeklyTotals.length : 0;

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

  function getShiftName(shiftCode: string): string {
    switch (shiftCode) {
      case 'D': return 'Day Shift';
      case 'E': return 'Early Shift';
      case 'N': return 'Night Shift';
      case 'R': return 'Rest Day';
      case 'S': return 'Sick/Leave';
      case 'L': return 'Late Shift';
      default: return shiftCode;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Roster - {staff.name}
            <Badge variant="outline">{staff.role}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalHours}h</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Working Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workingDays}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Hours/Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageHoursPerWeek.toFixed(1)}h</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1">
                  WTD Status
                  {averageHoursPerWeek > 48 && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={averageHoursPerWeek > 48 ? "destructive" : "default"}>
                  {averageHoursPerWeek > 48 ? "Over Limit" : "Compliant"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Weekly Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeklyTotals.map((week, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">
                        Week of {format(week.weekStart, 'MMM d, yyyy')}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">{week.totalHours}h total</span>
                        {week.totalHours > 48 && (
                          <Badge variant="destructive" className="text-xs">
                            Over 48h
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: 7 }, (_, dayIndex) => {
                        const currentDate = addDays(week.weekStart, dayIndex);
                        const dayAssignment = week.assignments.find(
                          assignment => assignment.date.toDateString() === currentDate.toDateString()
                        );
                        
                        return (
                          <div key={dayIndex} className="text-center">
                            <div className="text-xs text-gray-500 mb-1">
                              {format(currentDate, 'EEE')}
                            </div>
                            <div className="text-xs text-gray-600 mb-2">
                              {format(currentDate, 'MMM d')}
                            </div>
                            {dayAssignment ? (
                              <div className="space-y-1">
                                <div className={`px-2 py-1 rounded text-xs font-medium ${getShiftColor(dayAssignment.shiftCode)}`}>
                                  {dayAssignment.shiftCode}
                                </div>
                                {dayAssignment.shiftCode !== 'R' && (
                                  <>
                                    <div className="text-xs text-gray-600">
                                      {dayAssignment.shiftHours}h
                                    </div>
                                    {dayAssignment.shiftStart && dayAssignment.shiftEnd && (
                                      <div className="text-xs text-gray-500">
                                        {dayAssignment.shiftStart} - {dayAssignment.shiftEnd}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400">-</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Shift Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Shift Type Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(
                  staffAssignments.reduce((acc, assignment) => {
                    acc[assignment.shiftCode] = (acc[assignment.shiftCode] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([shiftCode, count]) => (
                  <div key={shiftCode} className="text-center p-3 border rounded-lg">
                    <div className={`inline-block px-3 py-1 rounded text-sm font-medium mb-2 ${getShiftColor(shiftCode)}`}>
                      {shiftCode}
                    </div>
                    <div className="text-sm text-gray-600">{getShiftName(shiftCode)}</div>
                    <div className="text-lg font-bold">{count} days</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
