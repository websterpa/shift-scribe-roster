
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Search, Filter } from 'lucide-react';
import { StaffDialog } from './StaffDialog';
import { LoadingState } from '@/components/ui/loading-state';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';

interface StaffMember {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  hire_date: string;
  is_active: boolean;
  role?: string;
  hourly_rate?: number;
  roles: {
    name: string;
  } | null;
}

const StaffList = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const { toast } = useToast();

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('staff_profiles')
        .select(`
          *,
          roles:role_id (
            name
          )
        `)
        .order('last_name');

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load staff data",
          variant: "destructive",
        });
      } else {
        setStaff(data || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Filter staff based on search and filters
  useEffect(() => {
    let filtered = staff;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(member => 
        member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => member.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => 
        statusFilter === 'active' ? member.is_active : !member.is_active
      );
    }

    setFilteredStaff(filtered);
  }, [staff, searchTerm, roleFilter, statusFilter]);

  const handleEdit = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setDialogOpen(true);
  };

  const handleDelete = (staffMember: StaffMember) => {
    setStaffToDelete(staffMember);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!staffToDelete) return;

    try {
      const { error } = await supabase
        .from('staff_profiles')
        .delete()
        .eq('id', staffToDelete.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Staff member deleted successfully",
      });
      
      fetchStaff();
    } catch (error: any) {
      console.error('Error deleting staff member:', error);
      toast({
        title: "Error",
        description: "Failed to delete staff member",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setStaffToDelete(null);
    }
  };

  const uniqueRoles = Array.from(new Set(staff.map(s => s.role || s.roles?.name).filter(Boolean)));

  if (loading) {
    return <LoadingState message="Loading staff..." />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <CardTitle>Staff Members ({filteredStaff.length})</CardTitle>
            <Button onClick={() => { setSelectedStaff(null); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff Member
            </Button>
          </div>
          
          {/* Enhanced search and filter controls */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or employee ID..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map(role => (
                    <SelectItem key={role} value={role!}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Employee ID</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Rate</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member) => (
                  <tr key={member.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-mono text-sm">{member.employee_id}</td>
                    <td className="p-2">
                      {member.first_name} {member.last_name}
                    </td>
                    <td className="p-2">{member.email}</td>
                    <td className="p-2">
                      {(member.role || member.roles?.name) && (
                        <Badge variant="outline">{member.role || member.roles?.name}</Badge>
                      )}
                    </td>
                    <td className="p-2">
                      {member.hourly_rate && (
                        <span className="text-sm">£{member.hourly_rate}/hr</span>
                      )}
                    </td>
                    <td className="p-2">
                      <Badge variant={member.is_active ? "default" : "secondary"}>
                        {member.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEdit(member)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDelete(member)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStaff.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
                  ? 'No staff members match your search criteria.'
                  : 'No staff members found. Add your first staff member to get started.'
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <StaffDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        staffMember={selectedStaff}
        onSuccess={fetchStaff}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {staffToDelete?.first_name} {staffToDelete?.last_name}? 
              This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default StaffList;
