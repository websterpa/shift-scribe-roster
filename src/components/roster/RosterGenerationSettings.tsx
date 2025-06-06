
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Loader2, Users, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConfigItem } from '@/types/roster';

interface RosterGenerationSettingsProps {
  configs: ConfigItem[];
  selectedConfig: ConfigItem | null;
  selectedConfigId: string;
  rosterName: string;
  staffCount: number;
  isGenerating: boolean;
  onSelectConfig: (configId: string) => void;
  onRosterNameChange: (name: string) => void;
  onGenerateRoster: () => void;
}

export const RosterGenerationSettings = ({
  configs,
  selectedConfig,
  selectedConfigId,
  rosterName,
  staffCount,
  isGenerating,
  onSelectConfig,
  onRosterNameChange,
  onGenerateRoster
}: RosterGenerationSettingsProps) => {
  const navigate = useNavigate();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Generation Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="config">Select Configuration:</Label>
          <Select value={selectedConfigId} onValueChange={onSelectConfig}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a configuration..." />
            </SelectTrigger>
            <SelectContent>
              {configs.map((config) => (
                <SelectItem key={config.id} value={config.id}>
                  {config.config_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {configs.length === 0 && (
            <p className="text-sm text-gray-500">
              No configurations found. <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/roster-config')}>Create one first</Button>
            </p>
          )}
        </div>

        {selectedConfig && (
          <div className="p-3 bg-gray-50 rounded-lg space-y-2">
            <h4 className="font-medium">{selectedConfig.config_name}</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Cycle: {selectedConfig.cycle_length_weeks} weeks</p>
              <p>Shifts: {selectedConfig.shift_type}</p>
              <p>Hours: {selectedConfig.operational_hours_per_day}h/day</p>
              <p>Start: {new Date(selectedConfig.start_date).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="rosterName">Roster Name:</Label>
          <Input
            id="rosterName"
            type="text"
            value={rosterName}
            onChange={(e) => onRosterNameChange(e.target.value)}
            placeholder="e.g. June 2025 Month 1"
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>{staffCount} staff members available</span>
        </div>

        <Button 
          onClick={onGenerateRoster}
          disabled={!selectedConfig || !rosterName.trim() || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4 mr-2" />
              Generate Roster
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
