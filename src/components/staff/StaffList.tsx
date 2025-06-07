
import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { Plus, User } from 'lucide-react';
import { useStaffData } from '@/hooks/useStaffData';
import { StaffDialog } from './StaffDialog';
import { StaffTable } from './StaffTable';
import { StaffActions } from './StaffActions';
import { toast } from '@/hooks/use-toast';
import { StaffMember } from '@/types/roster';
import { supabase } from '@/integrations/supabase/client';

const StaffList = () => {
  console.log('🔄 StaffList component rendered');
  
  const { staffMembers, loading, error, refreshStaff } = useStaffData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | undefined>(undefined);

  const handleAddStaff = () => {
    console.log('➕ StaffList: Add staff clicked');
    setEditingStaff(undefined);
    setIsDialogOpen(true);
  };

  const handleEditStaff = (staff: StaffMember) => {
    console.log('✏️ StaffList: Edit staff clicked for:', staff.id);
    setEditingStaff(staff);
    setIsDialogOpen(true);
  };

  const handleDeleteStaff = async (staffId: string) => {
    console.log('🗑️ StaffList: Delete staff clicked for:', staffId);
    if (!confirm('Are you sure you want to delete this staff member?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('staff_profiles')
        .delete()
        .eq('id', staffId);

      if (error) throw error;

      console.log('✅ StaffList: Staff member deleted successfully');
      toast({
        title: "Staff member deleted",
        description: "The staff member has been successfully removed.",
      });

      refreshStaff();
    } catch (error: any) {
      console.error('❌ StaffList: Error deleting staff member:', error);
      toast({
        title: "Error deleting staff member",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDialogSuccess = () => {
    console.log('✅ StaffList: Dialog success, refreshing staff list');
    setIsDialogOpen(false);
    setEditingStaff(undefined);
    refreshStaff();
  };

  if (loading) {
    return <LoadingState message="Loading staff members..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600">Error loading staff: {error}</p>
            <Button onClick={refreshStaff} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600">Manage your team members and their shift preferences.</p>
        </div>
        <Button onClick={handleAddStaff}>
          <Plus className="h-4 w-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Staff Members ({staffMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StaffActions onAddStaff={handleAddStaff} staffCount={staffMembers.length} />
          {staffMembers.length > 0 && (
            <StaffTable 
              staffMembers={staffMembers}
              onEdit={handleEditStaff}
              onDelete={handleDeleteStaff}
            />
          )}
        </CardContent>
      </Card>

      <StaffDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        staffMember={editingStaff}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
};

export default StaffList;
