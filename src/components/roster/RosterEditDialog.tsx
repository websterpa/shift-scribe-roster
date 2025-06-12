
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import PatternSelector from './PatternSelector';

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

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Shift Configuration</h3>
              <PatternSelector
                shiftLength={shiftType}
                onShiftLengthChange={setShiftType}
                selectedTemplate=""
                onTemplateChange={() => {}}
                customPattern={[]}
                onCustomPatternChange={() => {}}
                patternArray={pattern}
                onPatternArrayChange={setPattern}
                handoverMinutes={handoverMinutes}
                onHandoverChange={setHandoverMinutes}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving || loading || !rosterName.trim() || pattern.length === 0}
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
