import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Settings, Calendar, DollarSign, Clock, Users, Shield } from 'lucide-react';
import { RosterProgressTracker } from './RosterProgressTracker';
import { RosterResultsSummary } from './RosterResultsSummary';
import { toast } from '@/hooks/use-toast';
import { 
  ManagerRosterConfig, 
  RosterGenerationResult 
} from '@/features/roster/types';

// Re-export types for backwards compatibility
export type { ManagerRosterConfig, RosterGenerationResult };

interface ManagerRosterGeneratorProps {
  onGenerateRoster: (config: ManagerRosterConfig) => Promise<RosterGenerationResult>;
  isGenerating?: boolean;
  lastResult?: RosterGenerationResult | null;
}

export const ManagerRosterGenerator: React.FC<ManagerRosterGeneratorProps> = ({
  onGenerateRoster,
  isGenerating = false,
  lastResult = null
}) => {
  const [config, setConfig] = useState<ManagerRosterConfig>({
    shiftSystem: '12h',
    siteStartTime: '07:00',
    timezone: 'Europe/London',
    weeks: 17,
    defaultOtHours: 4,
    defaultOtStartTime: '10:00',
    budget: undefined,
    publicHolidayCap: undefined,
    allowSupervisorNights: false,
    coverageTargets: JSON.stringify({
      "day_shift_staff": 2,
      "night_shift_staff": 2,
      "early_shift_staff": 1,
      "late_shift_staff": 1
    }, null, 2)
  });

  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const handleConfigChange = <K extends keyof ManagerRosterConfig>(
    key: K,
    value: ManagerRosterConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const validateCoverageTargets = (targets: string): boolean => {
    try {
      const parsed = JSON.parse(targets);
      return typeof parsed === 'object' && parsed !== null;
    } catch {
      return false;
    }
  };

  const handleGenerate = async () => {
    console.log('🚀 ManagerRosterGenerator: Starting generation with config:', config);

    // Validation
    if (!validateCoverageTargets(config.coverageTargets)) {
      toast({
        title: "Invalid Coverage Targets",
        description: "Coverage targets must be valid JSON",
        variant: "destructive"
      });
      return;
    }

    if (config.weeks < 1 || config.weeks > 52) {
      toast({
        title: "Invalid Week Count",
        description: "Week count must be between 1 and 52",
        variant: "destructive"
      });
      return;
    }

    // Progress tracking simulation
    setProgress(0);
    setProgressMessage('Initializing roster generation...');
    
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + 20, 90);
        
        if (newProgress <= 20) setProgressMessage('Analyzing staff availability...');
        else if (newProgress <= 40) setProgressMessage('Checking leave constraints...');
        else if (newProgress <= 60) setProgressMessage('Optimising shift patterns...');
        else if (newProgress <= 80) setProgressMessage('Validating compliance rules...');
        else setProgressMessage('Finalizing roster assignments...');
        
        return newProgress;
      });
    }, 200);

    try {
      await onGenerateRoster(config);
      
      clearInterval(progressInterval);
      setProgress(100);
      setProgressMessage('Roster generation completed!');
      
      // Clear progress after a delay
      setTimeout(() => {
        setProgress(0);
        setProgressMessage('');
      }, 2000);

    } catch (error) {
      clearInterval(progressInterval);
      setProgress(0);
      setProgressMessage('');
      
      console.error('❌ ManagerRosterGenerator: Generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "An error occurred during roster generation",
        variant: "destructive"
      });
    }
  };

  const isValidConfig = () => {
    return (
      config.weeks >= 1 && 
      config.weeks <= 52 &&
      config.defaultOtHours > 0 &&
      config.siteStartTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/) &&
      config.defaultOtStartTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/) &&
      validateCoverageTargets(config.coverageTargets)
    );
  };

  return (
    <div className="space-y-6">
      {/* Progress Tracker */}
      {isGenerating && (
        <RosterProgressTracker
          isActive={isGenerating}
          progress={progress}
          message={progressMessage}
          timeRemaining={Math.max(5 - (progress / 20), 0)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manager Roster Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Basic Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Basic Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shiftSystem">Shift System</Label>
                <Select 
                  value={config.shiftSystem} 
                  onValueChange={(value: '8h' | '12h') => handleConfigChange('shiftSystem', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8h">8 Hour Shifts</SelectItem>
                    <SelectItem value="12h">12 Hour Shifts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteStartTime">Site Start Time</Label>
                <Input
                  id="siteStartTime"
                  type="time"
                  value={config.siteStartTime}
                  onChange={(e) => handleConfigChange('siteStartTime', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select 
                  value={config.timezone} 
                  onValueChange={(value) => handleConfigChange('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                    <SelectItem value="Europe/Dublin">Europe/Dublin</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weeks">Roster Weeks</Label>
                <Input
                  id="weeks"
                  type="number"
                  min="1"
                  max="52"
                  value={config.weeks}
                  onChange={(e) => handleConfigChange('weeks', parseInt(e.target.value) || 17)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* OT Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Overtime Defaults
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultOtHours">Default OT Hours</Label>
                <Input
                  id="defaultOtHours"
                  type="number"
                  min="0.5"
                  max="12"
                  step="0.5"
                  value={config.defaultOtHours}
                  onChange={(e) => handleConfigChange('defaultOtHours', parseFloat(e.target.value) || 4)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultOtStartTime">Default OT Start Time</Label>
                <Input
                  id="defaultOtStartTime"
                  type="time"
                  value={config.defaultOtStartTime}
                  onChange={(e) => handleConfigChange('defaultOtStartTime', e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Optional Constraints */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Optional Constraints
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (£)</Label>
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  placeholder="Optional"
                  value={config.budget || ''}
                  onChange={(e) => handleConfigChange('budget', e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicHolidayCap">PH Cap (shifts)</Label>
                <Input
                  id="publicHolidayCap"
                  type="number"
                  min="0"
                  placeholder="Optional"
                  value={config.publicHolidayCap || ''}
                  onChange={(e) => handleConfigChange('publicHolidayCap', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="allowSupervisorNights"
                  checked={config.allowSupervisorNights}
                  onCheckedChange={(checked) => handleConfigChange('allowSupervisorNights', checked)}
                />
                <Label htmlFor="allowSupervisorNights">Allow Supervisor Nights</Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Coverage Targets */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Coverage Targets
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="coverageTargets">Coverage Requirements (JSON)</Label>
              <Textarea
                id="coverageTargets"
                className="font-mono text-sm"
                rows={6}
                value={config.coverageTargets}
                onChange={(e) => handleConfigChange('coverageTargets', e.target.value)}
                placeholder="Enter coverage targets as JSON..."
              />
              {!validateCoverageTargets(config.coverageTargets) && (
                <p className="text-sm text-destructive">Invalid JSON format</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button 
              onClick={handleGenerate}
              disabled={!isValidConfig() || isGenerating}
              size="lg"
              className="min-w-[200px]"
            >
              {isGenerating ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </div>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Generate Roster ({config.weeks} weeks)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {lastResult && (
        <RosterResultsSummary result={lastResult} />
      )}
    </div>
  );
};