import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useStaffData } from '@/hooks/useStaffData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Users, Search, CheckCircle, XCircle } from 'lucide-react';

interface Pattern {
  id: string;
  name: string;
  pattern: string[];
  shift_type: '8h' | '12h';
}

interface PatternStaffAssignmentProps {
  pattern: Pattern | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignmentComplete?: () => void;
}

interface StaffWithAssignment {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  pattern_id: string | null;
  pattern_offset: number;
  availability_status: string;
}

export function PatternStaffAssignment({
  pattern,
  open,
  onOpenChange,
  onAssignmentComplete,
}: PatternStaffAssignmentProps) {
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [staffWithPatterns, setStaffWithPatterns] = useState<StaffWithAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { staffMembers, loading: staffLoading } = useStaffData();

  // Load staff with their current pattern assignments
  useEffect(() => {
    if (open && staffMembers.length > 0) {
      loadStaffPatternAssignments();
    }
  }, [open, staffMembers]);

  const loadStaffPatternAssignments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('id, first_name, last_name, role, pattern_id, pattern_offset, availability_status');

      if (error) throw error;

      setStaffWithPatterns(data || []);
      
      // Pre-select staff already assigned to this pattern
      if (pattern?.id) {
        const assignedStaff = data?.filter(s => s.pattern_id === pattern.id).map(s => s.id) || [];
        setSelectedStaffIds(new Set(assignedStaff));
      }
    } catch (error: any) {
      console.error('Error loading staff pattern assignments:', error);
      toast({
        title: "Error loading assignments",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStaff = (staffId: string) => {
    const newSelection = new Set(selectedStaffIds);
    if (newSelection.has(staffId)) {
      newSelection.delete(staffId);
    } else {
      newSelection.add(staffId);
    }
    setSelectedStaffIds(newSelection);
  };

  const handleSaveAssignments = async () => {
    if (!pattern?.id) return;

    setIsSaving(true);
    console.log('💾 Saving pattern assignments:', {
      patternId: pattern.id,
      selectedStaff: Array.from(selectedStaffIds)
    });

    try {
      // Get currently assigned staff
      const currentlyAssigned = staffWithPatterns
        .filter(s => s.pattern_id === pattern.id)
        .map(s => s.id);
      
      const toAssign = Array.from(selectedStaffIds).filter(id => !currentlyAssigned.includes(id));
      const toUnassign = currentlyAssigned.filter(id => !selectedStaffIds.has(id));

      console.log('📊 Assignment changes:', {
        toAssign,
        toUnassign,
        currentlyAssigned
      });

      // Assign new staff to pattern
      if (toAssign.length > 0) {
        const { error: assignError } = await supabase
          .from('staff_profiles')
          .update({
            pattern_id: pattern.id,
            pattern_offset: 0 // Start at offset 0 for new assignments
          })
          .in('id', toAssign);

        if (assignError) throw assignError;
      }

      // Unassign removed staff
      if (toUnassign.length > 0) {
        const { error: unassignError } = await supabase
          .from('staff_profiles')
          .update({
            pattern_id: null,
            pattern_offset: 0
          })
          .in('id', toUnassign);

        if (unassignError) throw unassignError;
      }

      toast({
        title: "Assignments saved",
        description: `${toAssign.length} staff assigned, ${toUnassign.length} unassigned`,
      });

      onAssignmentComplete?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('❌ Error saving assignments:', error);
      toast({
        title: "Error saving assignments",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStaff = staffWithPatterns.filter(staff =>
    `${staff.first_name} ${staff.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeStaff = filteredStaff.filter(s => s.availability_status === 'active');
  const unavailableStaff = filteredStaff.filter(s => s.availability_status !== 'active');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Staff to Pattern
          </DialogTitle>
          <DialogDescription>
            {pattern ? (
              <>
                Assign staff members to <strong>{pattern.name}</strong> pattern
              </>
            ) : (
              'Select a pattern to assign staff'
            )}
          </DialogDescription>
        </DialogHeader>

        {pattern && (
          <>
            {/* Pattern Preview */}
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{pattern.name}</span>
                <Badge variant="outline">{pattern.shift_type}</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {pattern.pattern.slice(0, 14).map((code, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {code}
                  </Badge>
                ))}
                {pattern.pattern.length > 14 && (
                  <span className="text-xs text-muted-foreground">
                    +{pattern.pattern.length - 14} more
                  </span>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff by name or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Staff List */}
            <ScrollArea className="h-[300px] pr-4">
              {isLoading || staffLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading staff...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Active Staff */}
                  {activeStaff.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Active Staff ({activeStaff.length})
                      </h4>
                      <div className="space-y-2">
                        {activeStaff.map((staff) => {
                          const isSelected = selectedStaffIds.has(staff.id);
                          const hasOtherPattern = staff.pattern_id && staff.pattern_id !== pattern.id;

                          return (
                            <div
                              key={staff.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                isSelected ? 'bg-primary/5 border-primary' : 'hover:bg-muted'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleToggleStaff(staff.id)}
                                />
                                <div>
                                  <div className="font-medium">
                                    {staff.first_name} {staff.last_name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {staff.role}
                                  </div>
                                </div>
                              </div>
                              {hasOtherPattern && (
                                <Badge variant="outline" className="text-xs">
                                  Has Pattern
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Unavailable Staff */}
                  {unavailableStaff.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-muted-foreground">
                          <XCircle className="h-4 w-4" />
                          Unavailable Staff ({unavailableStaff.length})
                        </h4>
                        <div className="space-y-2 opacity-60">
                          {unavailableStaff.map((staff) => {
                            const isSelected = selectedStaffIds.has(staff.id);

                            return (
                              <div
                                key={staff.id}
                                className="flex items-center justify-between p-3 rounded-lg border"
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => handleToggleStaff(staff.id)}
                                    disabled
                                  />
                                  <div>
                                    <div className="font-medium">
                                      {staff.first_name} {staff.last_name}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {staff.role}
                                    </div>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {staff.availability_status}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {filteredStaff.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">
                        No staff members found
                      </p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedStaffIds.size} staff selected
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveAssignments} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Assignments'
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
