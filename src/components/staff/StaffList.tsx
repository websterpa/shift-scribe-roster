
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { StaffDialog } from './StaffDialog';
import { Users, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StaffMember {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role?: string;
  is_active: boolean;
  hire_date: string;
  hourly_rate?: number;
  eligible_shifts: string[];
}

const StaffList = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      console.log('📊 Loading staff members...');
      setLoading(true);
      
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('*')
        .order('first_name');

      if (error) {
        console.error('❌ Error loading staff:', error);
        toast({
          title: "Error loading staff",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Loaded staff members:', data?.length || 0);
      setStaff(data || []);
    } catch (error: any) {
      console.error('❌ Exception loading staff:', error);
      toast({
        title: "Error loading staff",
        description: "Failed to load staff members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (staffMember: StaffMember) => {
    console.log('✏️ Editing staff member:', staffMember.first_name, staffMember.last_name);
    setSelectedStaff(staffMember);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    console.log('➕ Adding new staff member');
    setSelectedStaff(null);
    setDialogOpen(true);
  };

  const handleDelete = async (staffMember: StaffMember) => {
    if (!confirm(`Are you sure you want to deactivate ${staffMember.first_name} ${staffMember.last_name}?`)) {
      return;
    }

    try {
      console.log('🗑️ Deactivating staff member:', staffMember.id);
      
      const { error } = await supabase
        .from('staff_profiles')
        .update({ is_active: false })
        .eq('id', staffMember.id);

      if (error) {
        console.error('❌ Error deactivating staff:', error);
        toast({
          title: "Error deactivating staff",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Staff member deactivated');
      toast({
        title: "Staff deactivated",
        description: `${staffMember.first_name} ${staffMember.last_name} has been deactivated`,
      });
      
      await loadStaff();
    } catch (error: any) {
      console.error('❌ Exception deactivating staff:', error);
      toast({
        title: "Error deactivating staff",
        description: "Failed to deactivate staff member",
        variant: "destructive",
      });
    }
  };

  const filteredStaff = staff.filter(member =>
    member.is_active &&
    (member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.employee_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <LoadingState message="Loading staff members..." />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staff Members ({filteredStaff.length})
            </div>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search staff members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredStaff.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No staff members match your search' : 'No staff members found'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'Try a different search term' : 'Add your first staff member to get started'}
              </p>
              {!searchTerm && (
                <Button onClick={handleAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff Member
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Employee ID</th>
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">Role</th>
                    <th className="text-left py-3 px-4 font-medium">Eligible Shifts</th>
                    <th className="text-left py-3 px-4 font-medium">Hourly Rate</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((member) => (
                    <tr key={member.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">{member.employee_id}</td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{member.first_name} {member.last_name}</div>
                          <div className="text-sm text-gray-500">Hired: {new Date(member.hire_date).toLocaleDateString()}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{member.email}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{member.role || 'Staff'}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {member.eligible_shifts?.map((shift) => (
                            <Badge key={shift} variant="secondary" className="text-xs">
                              {shift}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {member.hourly_rate ? `£${member.hourly_rate.toFixed(2)}` : 'Not set'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(member)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(member)}
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
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        staff={selectedStaff}
        onSuccess={() => {
          loadStaff();
          setDialogOpen(false);
          setSelectedStaff(null);
        }}
      />
    </div>
  );
};

export default StaffList;
