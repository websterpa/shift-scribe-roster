
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface RosterVersion {
  id: string;
  version_name: string;
  version_number: number;
  generated_at: string;
  config: {
    config_name: string;
    shift_type: string;
    cycle_length_weeks: number;
  } | null;
  assignment_count?: number;
}

interface Props {
  roster: RosterVersion;
  open: boolean;
  onClose: () => void;
  onRosterUpdated: () => void;
}

export function RosterEditDialog({ roster, open, onClose, onRosterUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rosterName, setRosterName] = useState(roster.version_name);
  const [shiftType, setShiftType] = useState<'8h' | '12h'>('8h');
  const [pattern, setPattern] = useState<string[]>([]);
  const [handoverMinutes, setHandoverMinutes] = useState(0);
  
  useEffect(() => {
    if (open && roster) {
      loadRosterConfig();
    }
  }, [open, roster.id]);

  const loadRosterConfig = async () => {
    console.log('📥 RosterEditDialog: Loading roster config for:', roster.id);
    setLoading(true);
    
    try {
      // Get the roster version with config
      const { data: version, error: versionError } = await supabase
        .from('roster_versions')
        .select(`
          *,
          config:roster_config(*)
        `)
        .eq('id', roster.id)
        .single();

      if (versionError) {
        console.error('❌ RosterEditDialog: Error loading version:', versionError);
        throw versionError;
      }

      if (version?.config) {
        console.log('✅ RosterEditDialog: Loaded config:', version.config);
        setShiftType(version.config.shift_type as '8h' | '12h');
        setHandoverMinutes(version.config.handshake_minutes || 0);
        
        // Load pattern if it exists
        if (version.config.pattern && Array.isArray(version.config.pattern)) {
          const stringPattern = version.config.pattern.filter((item): item is string => typeof item === 'string');
          setPattern(stringPattern);
        }
      }
    } catch (error) {
      console.error('❌ RosterEditDialog: Exception loading config:', error);
      toast({
        title: "Error loading roster",
        description: "Failed to load roster configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log('💾 RosterEditDialog: Saving changes for roster:', roster.id);
    setSaving(true);

    try {
      // Update roster version name
      const { error: versionError } = await supabase
        .from('roster_versions')
        .update({
          version_name: rosterName
        })
        .eq('id', roster.id);

      if (versionError) {
        console.error('❌ RosterEditDialog: Error updating version:', versionError);
        throw versionError;
      }

      // Get the config ID to update the configuration
      const { data: version, error: getVersionError } = await supabase
        .from('roster_versions')
        .select('config_id')
        .eq('id', roster.id)
        .single();

      if (getVersionError || !version) {
        console.error('❌ RosterEditDialog: Error getting config ID:', getVersionError);
        throw getVersionError;
      }

      // Update the configuration
      const { error: configError } = await supabase
        .from('roster_config')
        .update({
          shift_type: shiftType,
          handshake_minutes: handoverMinutes,
          pattern: pattern
        })
        .eq('id', version.config_id);

      if (configError) {
        console.error('❌ RosterEditDialog: Error updating config:', configError);
        throw configError;
      }

      console.log('✅ RosterEditDialog: Successfully updated roster');
      toast({
        title: "Roster updated",
        description: `Successfully updated "${rosterName}"`,
      });

      onRosterUpdated();
    } catch (error) {
      console.error('❌ RosterEditDialog: Exception saving changes:', error);
      toast({
        title: "Save failed",
        description: "Failed to save roster changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePatternCode = (index: number, code: string) => {
    const newPattern = [...pattern];
    newPattern[index] = code;
    setPattern(newPattern);
  };

  const addPatternDay = () => {
    setPattern([...pattern, 'R']);
  };

  const removePatternDay = (index: number) => {
    const newPattern = pattern.filter((_, i) => i !== index);
    setPattern(newPattern);
  };

  const getShiftCodes = () => {
    if (shiftType === '12h') {
      return [
        { value: 'D', label: 'Day (D)', description: '07:00 - 19:00' },
        { value: 'N', label: 'Night (N)', description: '19:00 - 07:00' },
        { value: 'R', label: 'Rest (R)', description: 'Day off' }
      ];
    } else {
      return [
        { value: 'E', label: 'Early (E)', description: '07:45 - 15:45' },
        { value: 'L', label: 'Late (L)', description: '15:45 - 23:45' },
        { value: 'N', label: 'Night (N)', description: '23:45 - 07:45' },
        { value: 'R', label: 'Rest (R)', description: 'Day off' }
      ];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Roster: {roster.version_name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading roster configuration...</span>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="rosterName">Roster Name</Label>
              <Input
                id="rosterName"
                value={rosterName}
                onChange={(e) => setRosterName(e.target.value)}
                placeholder="Enter roster name"
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Shift Type</Label>
                <Select value={shiftType} onValueChange={(value: '8h' | '12h') => setShiftType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8h">8-Hour Shifts</SelectItem>
                    <SelectItem value="12h">12-Hour Shifts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Handover Time (Minutes)</Label>
                <Select value={handoverMinutes.toString()} onValueChange={(value) => setHandoverMinutes(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No handover (0 min)</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Shift Pattern ({pattern.length} days)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addPatternDay}>
                    Add Day
                  </Button>
                </div>
                
                {pattern.length > 0 ? (
                  <div className="grid grid-cols-7 gap-2">
                    {pattern.map((code, index) => (
                      <div key={index} className="space-y-1">
                        <div className="text-xs text-center text-muted-foreground">
                          Day {index + 1}
                        </div>
                        <div className="flex flex-col gap-1">
                          <Select 
                            value={code} 
                            onValueChange={(value) => updatePatternCode(index, value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getShiftCodes().map((shiftCode) => (
                                <SelectItem key={shiftCode.value} value={shiftCode.value}>
                                  <div className="text-xs">
                                    <div>{shiftCode.label}</div>
                                    <div className="text-muted-foreground">{shiftCode.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePatternDay(index)}
                            className="h-6 px-1 text-xs text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No pattern set. Click "Add Day" to create a pattern.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving || loading || !rosterName.trim()}
          >
            {saving ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
