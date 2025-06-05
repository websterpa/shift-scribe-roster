
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Plus, Check, X } from 'lucide-react';

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string | null;
  status: string;
  created_at: string;
  staff_profiles: {
    first_name: string;
    last_name: string;
    employee_id: string;
  } | null;
}

const LeaveRequestsList = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          id,
          leave_type,
          start_date,
          end_date,
          days_requested,
          reason,
          status,
          created_at,
          staff_profiles!inner (
            first_name,
            last_name,
            employee_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        toast({
          title: "Error",
          description: "Failed to load leave requests",
          variant: "destructive",
        });
      } else {
        console.log('Fetched requests:', data);
        setRequests(data || []);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast({
        title: "Error",
        description: "Failed to load leave requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'annual':
        return 'bg-blue-100 text-blue-800';
      case 'sick':
        return 'bg-red-100 text-red-800';
      case 'emergency':
        return 'bg-orange-100 text-orange-800';
      case 'unpaid':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading leave requests...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Leave Requests</CardTitle>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Leave Request
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="border rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">
                    {request.staff_profiles?.first_name} {request.staff_profiles?.last_name}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({request.staff_profiles?.employee_id})
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getLeaveTypeColor(request.leave_type)}>
                    {request.leave_type.toUpperCase()}
                  </Badge>
                  <Badge className={getStatusColor(request.status)}>
                    {request.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Duration:</span>
                  <div>
                    {format(new Date(request.start_date), 'MMM d, yyyy')} -{' '}
                    {format(new Date(request.end_date), 'MMM d, yyyy')}
                  </div>
                  <div className="text-gray-500">
                    {request.days_requested} day{request.days_requested !== 1 ? 's' : ''}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Reason:</span>
                  <div className="text-gray-600">
                    {request.reason || 'No reason provided'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Requested:</span>
                  <div className="text-gray-500">
                    {format(new Date(request.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
              {request.status === 'pending' && (
                <div className="flex justify-end space-x-2 mt-4">
                  <Button variant="outline" size="sm">
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button size="sm">
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                </div>
              )}
            </div>
          ))}
          {requests.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No leave requests found.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaveRequestsList;
