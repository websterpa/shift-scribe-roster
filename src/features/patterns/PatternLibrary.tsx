import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingState } from '@/components/ui/loading-state';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from '@/hooks/use-toast';
import { Clock, Users, Calendar, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';

interface SitePattern {
  id: string;
  name: string;
  description?: string;
  cycle_length: number;
  sequence: string[];
  avg_weekly_hours?: number;
  teams_required?: number;
  system: '8h' | '12h';
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  role?: string;
  pattern_id?: string | null;
}

const getShiftCodeColor = (code: string): string => {
  const colors: Record<string, string> = {
    'D': 'bg-amber-500 text-white',
    'N': 'bg-indigo-700 text-white',
    'E': 'bg-sky-500 text-white',
    'L': 'bg-orange-500 text-white',
    'R': 'bg-slate-200 text-slate-700',
  };
  return colors[code] || 'bg-gray-400 text-white';
};

const PatternCard: React.FC<{
  pattern: SitePattern;
  onAssign: (patternId: string) => void;
}> = ({ pattern, onAssign }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{pattern.name}</CardTitle>
            <CardDescription className="mt-1">
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {pattern.cycle_length} days
                </Badge>
                {pattern.avg_weekly_hours && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {pattern.avg_weekly_hours}h/week
                  </Badge>
                )}
                {pattern.teams_required && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {pattern.teams_required} teams
                  </Badge>
                )}
              </div>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {pattern.description && (
          <p className="text-sm text-muted-foreground">{pattern.description}</p>
        )}
        
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="mb-2 w-full justify-between"
          >
            <span>Shift Sequence</span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          {expanded && (
            <div className="flex flex-wrap gap-1 p-3 bg-muted rounded-lg">
              {pattern.sequence.map((code, idx) => (
                <div
                  key={idx}
                  className={`w-8 h-8 flex items-center justify-center rounded text-xs font-semibold ${getShiftCodeColor(code)}`}
                  title={`Day ${idx + 1}: ${code}`}
                >
                  {code}
                </div>
              ))}
            </div>
          )}
        </div>

        <Button 
          onClick={() => onAssign(pattern.id)}
          className="w-full"
          variant="default"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Assign to Staff
        </Button>
      </CardContent>
    </Card>
  );
};

const StaffAssignmentDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patternId: string;
  patternName: string;
}> = ({ open, onOpenChange, patternId, patternName }) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadStaff();
    }
  }, [open]);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('id, first_name, last_name, role, pattern_id')
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setStaff(data || []);
      
      // Pre-select staff already assigned to this pattern
      const alreadyAssigned = (data || [])
        .filter(s => s.pattern_id === patternId)
        .map(s => s.id);
      setSelectedStaff(alreadyAssigned);
    } catch (error: any) {
      console.error('Error loading staff:', error);
      toast({
        title: "Error loading staff",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStaff = (staffId: string, checked: boolean) => {
    setSelectedStaff(prev => 
      checked ? [...prev, staffId] : prev.filter(id => id !== staffId)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update all selected staff to use this pattern
      const updates = selectedStaff.map(staffId => 
        supabase
          .from('staff_profiles')
          .update({ pattern_id: patternId, pattern_offset: 0 })
          .eq('id', staffId)
      );

      // Remove pattern from deselected staff who had this pattern
      const staffToUnassign = staff
        .filter(s => s.pattern_id === patternId && !selectedStaff.includes(s.id))
        .map(s => s.id);

      if (staffToUnassign.length > 0) {
        updates.push(
          supabase
            .from('staff_profiles')
            .update({ pattern_id: null, pattern_offset: 0 })
            .in('id', staffToUnassign)
        );
      }

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw errors[0].error;
      }

      toast({
        title: "Pattern assigned",
        description: `Successfully assigned "${patternName}" to ${selectedStaff.length} staff member(s)`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error assigning pattern:', error);
      toast({
        title: "Error assigning pattern",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Assign "{patternName}" to Staff</DialogTitle>
        </DialogHeader>

        {loading ? (
          <LoadingState message="Loading staff members..." />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select staff members to assign this pattern. Their existing pattern will be replaced.
            </p>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              {staff.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No active staff members found
                </div>
              ) : (
                <div className="divide-y">
                  {staff.map(member => (
                    <div key={member.id} className="flex items-center gap-3 p-3 hover:bg-muted/50">
                      <Checkbox
                        id={`staff-${member.id}`}
                        checked={selectedStaff.includes(member.id)}
                        onCheckedChange={(checked) => 
                          handleToggleStaff(member.id, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={`staff-${member.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">
                          {member.first_name} {member.last_name}
                        </div>
                        {member.role && (
                          <div className="text-sm text-muted-foreground">{member.role}</div>
                        )}
                      </label>
                      {member.pattern_id === patternId && (
                        <Badge variant="secondary">Currently assigned</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedStaff.length} staff member(s) selected
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Assign Pattern'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const PatternLibrary: React.FC = () => {
  const { user } = useSupabaseAuth();
  const [patterns, setPatterns] = useState<SitePattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSystem, setFilterSystem] = useState<'all' | '8h' | '12h'>('all');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<SitePattern | null>(null);

  useEffect(() => {
    if (user) {
      loadPatterns();
    }
  }, [user]);

  const loadPatterns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_patterns')
        .select('*')
        .order('name');

      if (error) throw error;

      // Map and normalize patterns
      const normalized: SitePattern[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        cycle_length: row.cycle_length || 0,
        sequence: Array.isArray(row.sequence) 
          ? row.sequence.filter((s): s is string => typeof s === 'string')
          : [],
        avg_weekly_hours: row.avg_weekly_hours || undefined,
        teams_required: row.teams_required || undefined,
        system: row.system as '8h' | '12h',
      }));

      setPatterns(normalized);
    } catch (error: any) {
      console.error('Error loading patterns:', error);
      toast({
        title: "Error loading patterns",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPattern = (patternId: string) => {
    const pattern = patterns.find(p => p.id === patternId);
    if (pattern) {
      setSelectedPattern(pattern);
      setAssignDialogOpen(true);
    }
  };

  const filteredPatterns = patterns.filter(p => 
    filterSystem === 'all' || p.system === filterSystem
  );

  if (loading) {
    return <LoadingState message="Loading pattern library..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pattern Library</h2>
          <p className="text-muted-foreground">
            View and assign shift patterns to staff members
          </p>
        </div>

        <Select value={filterSystem} onValueChange={(v) => setFilterSystem(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Systems</SelectItem>
            <SelectItem value="8h">8-Hour</SelectItem>
            <SelectItem value="12h">12-Hour</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredPatterns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              No patterns found. Contact your administrator to seed patterns.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatterns.map(pattern => (
            <PatternCard
              key={pattern.id}
              pattern={pattern}
              onAssign={handleAssignPattern}
            />
          ))}
        </div>
      )}

      {selectedPattern && (
        <StaffAssignmentDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          patternId={selectedPattern.id}
          patternName={selectedPattern.name}
        />
      )}
    </div>
  );
};
