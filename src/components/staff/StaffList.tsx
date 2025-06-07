
import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { Plus, Edit, Trash2, User } from 'lucide-react';
import { useStaffData } from '@/hooks/useStaffData';
import { StaffDialog } from './StaffDialog';
import { toast } from '@/hooks/use-toast';
import { StaffMember } from '@/types/roster';
import { supabase } from '@/integrations/supabase/client';

const StaffList = () => {
  const { staffMembers, loading, error, refreshStaff } = useStaffData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | undefined>(undefined);

  const handleAddStaff = () => {
    setEditingStaff(undefined);
    setIsDialogOpen(true);
  };

  const handleEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff);
    setIsDialogOpen(true);
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('staff_profiles')
        .delete()
        .eq('id', staffId);

      if (error) throw error;

      toast({
        title: "Staff member deleted",
        description: "The staff member has been successfully removed.",
      });

      refreshStaff();
    } catch (error: any) {
      console.error('Error deleting staff member:', error);
      toast({
        title: "Error deleting staff member",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDialogSuccess = () => {
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
          {staffMembers.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members yet</h3>
              <p className="text-gray-500 mb-4">
                Add your first staff member to get started with roster generation.
              </p>
              <Button onClick={handleAddStaff}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Staff Member
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">Employee ID</th>
                    <th className="text-left py-3 px-4 font-medium">Role</th>
                    <th className="text-left py-3 px-4 font-medium">Rate</th>
                    <th className="text-left py-3 px-4 font-medium">Hours/Week</th>
                    <th className="text-left py-3 px-4 font-medium">Eligible Shifts</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffMembers.map((staff) => (
                    <tr key={staff.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{staff.first_name} {staff.last_name}</div>
                        <div className="text-sm text-gray-500">{staff.email}</div>
                      </td>
                      <td className="py-3 px-4">{staff.employee_id}</td>
                      <td className="py-3 px-4">{staff.role}</td>
                      <td className="py-3 px-4">£{staff.hourly_rate}/hr</td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {staff.min_hours_per_week} - {staff.max_hours_per_week}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {staff.eligible_shifts?.map((shift, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {shift}
                            </span>
                          )) || <span className="text-gray-400">None</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          staff.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {staff.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditStaff(staff)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteStaff(staff.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
