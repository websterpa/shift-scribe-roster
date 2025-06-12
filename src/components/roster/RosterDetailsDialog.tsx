
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Calendar, Clock, Users, DollarSign } from 'lucide-react';

interface RosterAssignment {
  id: string;
  date: string;
  shift_code: string;
  hours: number;
  cost: number;
  staff_profiles: {
    first_name: string;
    last_name: string;
    employee_id: string;
    role: string;
  };
}

interface RosterDetailsDialogProps {
  rosterId: string;
  rosterName: string;
  children: React.ReactNode;
}

export function RosterDetailsDialog({ rosterId, rosterName, children }: RosterDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const [assignments, setAssignments] = useState<RosterAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalHours: 0,
    totalCost: 0,
    staffCount: 0,
    daysSpanned: 0
  });

  const fetchRosterDetails = async () => {
    if (!open || !rosterId) return;
    
    setLoading(true);
    try {
      console.log('🔄 RosterDetailsDialog: Fetching assignments for roster:', rosterId);
      
      const { data, error } = await supabase
        .from('roster_assignments')
        .select(`
          id,
          date,
          shift_code,
          hours,
          cost,
          staff_profiles!roster_assignments_staff_id_fkey (
            first_name,
            last_name,
            employee_id,
            role
          )
        `)
        .eq('version_id', rosterId)
        .order('date', { ascending: true });

      if (error) {
        console.error('❌ RosterDetailsDialog: Error fetching assignments:', error);
        return;
      }

      console.log('✅ RosterDetailsDialog: Fetched assignments:', data?.length || 0);
      setAssignments(data || []);

      // Calculate statistics
      const totalHours = data?.reduce((sum, assignment) => sum + (assignment.hours || 0), 0) || 0;
      const totalCost = data?.reduce((sum, assignment) => sum + (assignment.cost || 0), 0) || 0;
      const uniqueStaff = new Set(data?.map(assignment => assignment.staff_profiles?.employee_id)).size;
      const uniqueDates = new Set(data?.map(assignment => assignment.date)).size;

      setStats({
        totalHours,
        totalCost,
        staffCount: uniqueStaff,
        daysSpanned: uniqueDates
      });
    } catch (error) {
      console.error('❌ RosterDetailsDialog: Exception:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRosterDetails();
  }, [open, rosterId]);

  const getShiftCodeColor = (code: string) => {
    const colors = {
      'D': 'bg-yellow-100 text-yellow-800',
      'E': 'bg-blue-100 text-blue-800',
      'L': 'bg-orange-100 text-orange-800',
      'N': 'bg-purple-100 text-purple-800',
      'R': 'bg-gray-100 text-gray-800'
    };
    return colors[code as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const groupedAssignments = assignments.reduce((groups, assignment) => {
    const date = assignment.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(assignment);
    return groups;
  }, {} as Record<string, RosterAssignment[]>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {rosterName} - Details
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading roster details...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Hours</p>
                      <p className="text-lg font-semibold">{stats.totalHours}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Cost</p>
                      <p className="text-lg font-semibold">£{stats.totalCost.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Staff Count</p>
                      <p className="text-lg font-semibold">{stats.staffCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Days Spanned</p>
                      <p className="text-lg font-semibold">{stats.daysSpanned}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Assignments by Date */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {Object.entries(groupedAssignments).map(([date, dayAssignments]) => (
                      <div key={date} className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-3">
                          {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {dayAssignments.map((assignment) => (
                            <div key={assignment.id} className="flex items-center justify-between p-2 bg-muted rounded">
                              <div className="flex items-center gap-2">
                                <Badge className={getShiftCodeColor(assignment.shift_code)}>
                                  {assignment.shift_code}
                                </Badge>
                                <div>
                                  <p className="text-sm font-medium">
                                    {assignment.staff_profiles?.first_name} {assignment.staff_profiles?.last_name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {assignment.staff_profiles?.role} • {assignment.hours}h
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">£{assignment.cost?.toFixed(2) || '0.00'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
