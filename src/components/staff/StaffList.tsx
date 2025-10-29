
import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { Plus, User, Eye, EyeOff, Shuffle } from 'lucide-react';
import { useStaffData } from '@/hooks/useStaffData';
import { StaffDialog } from './StaffDialog';
import { StaffTable } from './StaffTable';
import { StaffActions } from './StaffActions';
import { toast } from '@/hooks/use-toast';
import { StaffMember } from '@/types/roster';
import { supabase } from '@/integrations/supabase/client';
import { autoDistributePatternOffsets } from '@/utils/patternOffsetDistributor';

const StaffList = () => {
  console.log('🔄 StaffList component rendered');
  
  const { staffMembers, loading, error, refreshStaff } = useStaffData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'temporarily_unavailable' | 'inactive'>('all');
  const [isDistributing, setIsDistributing] = useState(false);

  const handleAddStaff = () => {
    console.log('➕ StaffList: Add staff clicked');
    setEditingStaff(undefined);
    setIsDialogOpen(true);
  };

  const handleAutoDistributeOffsets = async () => {
    console.log('🔄 StaffList: Auto-distribute offsets clicked');
    
    if (!confirm('This will automatically distribute pattern offsets among staff sharing the same pattern. Continue?')) {
      return;
    }

    setIsDistributing(true);
    
    try {
      // Convert StaffMember to the format expected by autoDistributePatternOffsets
      const staffForDistribution = staffMembers.map(s => ({
        id: s.id,
        pattern_id: s.pattern_id,
        pattern_offset: s.pattern_offset,
        first_name: s.first_name,
        last_name: s.last_name,
      }));

      await autoDistributePatternOffsets(staffForDistribution, supabase, false);

      console.log('✅ StaffList: Pattern offsets distributed successfully');
      toast({
        title: "Pattern Offsets Distributed",
        description: "Staff pattern offsets have been automatically distributed for balanced rotation.",
      });

      refreshStaff();
    } catch (error: any) {
      console.error('❌ StaffList: Error distributing offsets:', error);
      toast({
        title: "Error distributing offsets",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDistributing(false);
    }
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

  // Filter staff based on the selected filter
  const filteredStaff = filterStatus === 'all' 
    ? staffMembers
    : staffMembers.filter(staff => staff.availability_status === filterStatus);

  const activeCount = staffMembers.filter(staff => staff.availability_status === 'active').length;
  const tempUnavailableCount = staffMembers.filter(staff => staff.availability_status === 'temporarily_unavailable').length;
  const inactiveCount = staffMembers.filter(staff => staff.availability_status === 'inactive').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600">
            Manage your team members and their availability status.
            <span className="text-sm text-gray-500 ml-2">
              ({activeCount} active, {tempUnavailableCount} temporarily unavailable, {inactiveCount} inactive)
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilterStatus('all')}
              className="text-xs"
            >
              All ({staffMembers.length})
            </Button>
            <Button
              variant={filterStatus === 'active' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilterStatus('active')}
              className="text-xs"
            >
              Active ({activeCount})
            </Button>
            {tempUnavailableCount > 0 && (
              <Button
                variant={filterStatus === 'temporarily_unavailable' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilterStatus('temporarily_unavailable')}
                className="text-xs"
              >
                Temp. Unavailable ({tempUnavailableCount})
              </Button>
            )}
            {inactiveCount > 0 && (
              <Button
                variant={filterStatus === 'inactive' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilterStatus('inactive')}
                className="text-xs"
              >
                Inactive ({inactiveCount})
              </Button>
            )}
          </div>
          <Button 
            onClick={handleAutoDistributeOffsets}
            variant="outline"
            disabled={isDistributing}
          >
            <Shuffle className="h-4 w-4 mr-2" />
            {isDistributing ? 'Distributing...' : 'Auto-Distribute Offsets'}
          </Button>
          <Button onClick={handleAddStaff}>
            <Plus className="h-4 w-4 mr-2" />
            Add Staff Member
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Staff Members ({filteredStaff.length})
            {filterStatus !== 'all' && (
              <span className="text-sm font-normal text-gray-500">
                ({filterStatus === 'temporarily_unavailable' ? 'Temporarily Unavailable' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} only)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StaffActions onAddStaff={handleAddStaff} staffCount={filteredStaff.length} />
          {filteredStaff.length > 0 && (
            <StaffTable 
              staffMembers={filteredStaff}
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
