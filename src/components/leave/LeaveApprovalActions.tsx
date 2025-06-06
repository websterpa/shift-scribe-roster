
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Check, X } from 'lucide-react';

interface LeaveApprovalActionsProps {
  requestId: string;
  onStatusChange: () => void;
}

export const LeaveApprovalActions: React.FC<LeaveApprovalActionsProps> = ({
  requestId,
  onStatusChange
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateLeaveStatus = async (status: 'approved' | 'rejected') => {
    try {
      setIsUpdating(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status,
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        throw error;
      }

      toast({
        title: `Leave request ${status}`,
        description: `The leave request has been ${status}`,
      });

      onStatusChange();
    } catch (error) {
      console.error('Error updating leave status:', error);
      toast({
        title: "Error",
        description: "Failed to update leave request status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => updateLeaveStatus('rejected')}
        disabled={isUpdating}
      >
        <X className="w-4 h-4 mr-1" />
        Reject
      </Button>
      <Button
        size="sm"
        onClick={() => updateLeaveStatus('approved')}
        disabled={isUpdating}
      >
        <Check className="w-4 h-4 mr-1" />
        Approve
      </Button>
    </div>
  );
};
