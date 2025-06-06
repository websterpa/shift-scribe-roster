
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllConfigs, fetchConfigById } from '@/utils/configHelpers';
import { fetchStaffMembers, generateAndSaveRoster } from '@/utils/enhancedRosterCalculations';
import { ConfigItem } from '@/types/roster';

export const useRosterGeneration = (configIdFromUrl: string | null) => {
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
      
      // Type cast the returned configs to ensure they match our ConfigItem interface
      const typedConfigs: ConfigItem[] = configsData.map(config => ({
        ...config,
        shift_type: config.shift_type as "8h" | "12h"
      }));
      
      setConfigs(typedConfigs);
      setStaffList(staffData);
      
      if (configIdFromUrl && typedConfigs.find(c => c.id === configIdFromUrl)) {
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
      // Ensure shift_type is properly typed
      const typedConfig: ConfigItem = {
        ...config,
        shift_type: config.shift_type as "8h" | "12h"
      };
      setSelectedConfig(typedConfig);
      
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

  // Helper function to save roster with name
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

  return {
    configs,
    selectedConfigId,
    selectedConfig,
    rosterName,
    staffList,
    isGenerating,
    isLoading,
    generatedVersionId,
    setSelectedConfigId,
    setRosterName,
    handleGenerateRoster
  };
};
