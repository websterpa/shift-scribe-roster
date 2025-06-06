
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchAllConfigs, fetchConfigById } from '@/utils/configHelpers';
import { generateAndSaveRoster, fetchStaffMembers } from '@/utils/enhancedRosterCalculations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Users, Settings, Loader2 } from 'lucide-react';
import { MultiWeekRoster } from '@/components/roster/MultiWeekRoster';

interface ConfigItem {
  id: string;
  config_name: string;
  cycle_length_weeks: number;
  shift_type: string;
  operational_hours_per_day: number;
  handshake_minutes: number;
  start_date: string;
}

const GenerateRoster = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const configIdFromUrl = searchParams.get('configId');
  
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>(configIdFromUrl || '');
  const [selectedConfig, setSelectedConfig] = useState<ConfigItem | null>(null);
  const [rosterName, setRosterName] = useState('');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [generatedVersionId, setGeneratedVersionId] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedConfigId) {
      loadSelectedConfig(selectedConfigId);
    }
  }, [selectedConfigId]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [configsData, staffData] = await Promise.all([
        fetchAllConfigs(),
        fetchStaffMembers()
      ]);
      
      setConfigs(configsData);
      setStaffList(staffData);
      
      if (configIdFromUrl && configsData.find(c => c.id === configIdFromUrl)) {
        setSelectedConfigId(configIdFromUrl);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load configurations and staff data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSelectedConfig = async (configId: string) => {
    try {
      const config = await fetchConfigById(configId);
      setSelectedConfig(config);
      
      // Auto-generate a roster name based on config and current date
      const today = new Date();
      const monthName = today.toLocaleDateString('en-US', { month: 'long' });
      const year = today.getFullYear();
      setRosterName(`${config.config_name} - ${monthName} ${year}`);
    } catch (error) {
      console.error('Error loading selected config:', error);
      toast({
        title: "Error loading configuration",
        description: "Failed to load the selected configuration",
        variant: "destructive",
      });
    }
  };

  const handleGenerateRoster = async () => {
    if (!selectedConfig) {
      toast({
        title: "No configuration selected",
        description: "Please select a configuration first",
        variant: "destructive",
      });
      return;
    }

    if (!rosterName.trim()) {
      toast({
        title: "Roster name required",
        description: "Please enter a name for this roster",
        variant: "destructive",
      });
      return;
    }

    if (staffList.length === 0) {
      toast({
        title: "No staff available",
        description: "Please add staff members before generating a roster",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      
      // Convert the config to the format expected by generateAndSaveRoster
      const configForGeneration = {
        id: selectedConfig.id,
        cycle_length_weeks: selectedConfig.cycle_length_weeks,
        shift_type: selectedConfig.shift_type as "8h" | "12h",
        operational_hours_per_day: selectedConfig.operational_hours_per_day,
        handshake_minutes: selectedConfig.handshake_minutes,
        start_date: selectedConfig.start_date
      };

      // This will be updated when we modify generateAndSaveRoster to accept versionName
      const versionId = await generateAndSaveRosterWithName(
        staffList,
        configForGeneration,
        rosterName.trim()
      );
      
      setGeneratedVersionId(versionId);
      
      toast({
        title: "Roster generated successfully",
        description: `Generated roster: ${rosterName}`,
      });
      
    } catch (error) {
      console.error('Error generating roster:', error);
      toast({
        title: "Generation failed",
        description: "Failed to generate roster. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Temporary function - we'll update generateAndSaveRoster to include this
  const generateAndSaveRosterWithName = async (staffList: any[], config: any, versionName: string) => {
    // For now, call the existing function and then update the version name
    const versionId = await generateAndSaveRoster(staffList, config);
    
    // Update the version with the name
    const { error } = await supabase.from('roster_versions')
      .update({ version_name: versionName })
      .eq('id', versionId);
      
    if (error) {
      console.error('Error updating version name:', error);
    }
    
    return versionId;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Generate Roster</h1>
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Generate Roster</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/my-configurations')}>
            <Settings className="h-4 w-4 mr-2" />
            My Configurations
          </Button>
          <Button variant="outline" onClick={() => navigate('/my-rosters')}>
            <Calendar className="h-4 w-4 mr-2" />
            My Rosters
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
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
                <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
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
                  onChange={(e) => setRosterName(e.target.value)}
                  placeholder="e.g. June 2025 Month 1"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{staffList.length} staff members available</span>
              </div>

              <Button 
                onClick={handleGenerateRoster}
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
        </div>

        <div className="lg:col-span-2">
          {selectedConfig && (
            <MultiWeekRoster 
              staffList={staffList}
              config={selectedConfig}
              showWeeks={selectedConfig.cycle_length_weeks || 4}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateRoster;
