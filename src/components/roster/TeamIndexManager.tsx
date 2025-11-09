/**
 * Team Index Manager Component
 * 
 * Allows manual assignment of team_index to staff members for deterministic
 * pattern positioning in locked pattern adherence mode.
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Save, RotateCcw, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  name?: string;
  team_index?: number | null;
}

interface TeamIndexManagerProps {
  staffList: StaffMember[];
  onUpdate?: () => void;
}

export function TeamIndexManager({ staffList, onUpdate }: TeamIndexManagerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [localStaff, setLocalStaff] = useState<StaffMember[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLocalStaff(staffList);
    }
  }, [open, staffList]);

  const handleTeamIndexChange = (staffId: string, value: string) => {
    const numValue = value === '' ? null : parseInt(value);
    setLocalStaff(prev =>
      prev.map(s => (s.id === staffId ? { ...s, team_index: numValue } : s))
    );
  };

  const handleAutoAssign = () => {
    // Sort by last name and assign team indices evenly
    const sorted = [...localStaff].sort((a, b) => {
      const lastA = (a.last_name || '').toLowerCase();
      const lastB = (b.last_name || '').toLowerCase();
      return lastA.localeCompare(lastB);
    });

    // Determine teams_required (default to 5)
    const teamsRequired = 5;
    
    const updated = sorted.map((staff, idx) => ({
      ...staff,
      team_index: idx % teamsRequired,
    }));

    setLocalStaff(updated);
    
    toast({
      title: "Auto-Assigned",
      description: `Distributed ${updated.length} staff across ${teamsRequired} teams alphabetically`,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update each staff member's team_index
      const updates = localStaff.map(async (staff) => {
        const { error } = await supabase
          .from('staff_profiles')
          .update({ team_index: staff.team_index })
          .eq('id', staff.id);

        if (error) throw error;
      });

      await Promise.all(updates);

      toast({
        title: "Team Indices Saved",
        description: `Updated ${localStaff.length} staff members`,
      });

      onUpdate?.();
      setOpen(false);
    } catch (error) {
      console.error('Failed to save team indices:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save team indices",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getTeamColor = (teamIndex: number | null) => {
    if (teamIndex === null) return 'bg-gray-200 text-gray-700';
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-green-100 text-green-700',
      'bg-yellow-100 text-yellow-700',
      'bg-red-100 text-red-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
      'bg-indigo-100 text-indigo-700',
      'bg-orange-100 text-orange-700',
    ];
    return colors[teamIndex % colors.length];
  };

  const staffWithoutTeamIndex = localStaff.filter(s => s.team_index === null || s.team_index === undefined).length;
  const teamDistribution = localStaff.reduce((acc, s) => {
    if (s.team_index !== null && s.team_index !== undefined) {
      acc[s.team_index] = (acc[s.team_index] || 0) + 1;
    }
    return acc;
  }, {} as Record<number, number>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Manage Team Indices
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Team Index Assignment</DialogTitle>
          <DialogDescription>
            Assign team indices (0-based) to staff members for deterministic pattern positioning.
            Staff with the same team_index will follow the same pattern offset.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Locked mode only:</strong> Team indices determine each person's starting position in the pattern cycle.
            Lower indices start earlier in the pattern. Auto-assign distributes staff evenly by surname.
          </AlertDescription>
        </Alert>

        {staffWithoutTeamIndex > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              {staffWithoutTeamIndex} staff member(s) have no team_index assigned. Use Auto-Assign or set manually.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <Button onClick={handleAutoAssign} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Auto-Assign
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {Object.keys(teamDistribution).length} teams, {localStaff.length} staff
          </div>
        </div>

        {/* Team Distribution Summary */}
        {Object.keys(teamDistribution).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 p-3 bg-slate-50 rounded-md">
            {Object.entries(teamDistribution)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([team, count]) => (
                <Badge key={team} className={getTeamColor(parseInt(team))}>
                  Team {team}: {count} staff
                </Badge>
              ))}
          </div>
        )}

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {localStaff
              .sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''))
              .map((staff) => (
                <div
                  key={staff.id}
                  className="flex items-center gap-3 p-3 border rounded-md hover:bg-slate-50"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {staff.name || `${staff.first_name} ${staff.last_name}`}
                    </div>
                  </div>
                  <div className="w-32">
                    <Label htmlFor={`team-${staff.id}`} className="sr-only">
                      Team Index
                    </Label>
                    <Input
                      id={`team-${staff.id}`}
                      type="number"
                      min="0"
                      max="20"
                      placeholder="Team #"
                      value={staff.team_index ?? ''}
                      onChange={(e) => handleTeamIndexChange(staff.id, e.target.value)}
                      className="text-center"
                    />
                  </div>
                  <Badge className={getTeamColor(staff.team_index)}>
                    {staff.team_index !== null ? `Team ${staff.team_index}` : 'Unassigned'}
                  </Badge>
                </div>
              ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
