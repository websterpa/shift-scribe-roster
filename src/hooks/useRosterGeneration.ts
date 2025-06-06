
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
  const [errors, setErrors] = useState<{
    configs?: string;
    staff?: string;
    general?: string;
  }>({});

  useEffect(() => {
    console.log('useRosterGeneration hook initialized', { configIdFromUrl });
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedConfigId) {
      console.log('Selected config ID changed:', selectedConfigId);
      loadSelectedConfig(selectedConfigId);
    } else {
      console.log('No config ID selected');
      setSelectedConfig(null);
    }
  }, [selectedConfigId]);

  const loadInitialData = async () => {
    console.log('Loading initial data for roster generation...');
    try {
      setIsLoading(true);
      setErrors({});
      
      const configsPromise = fetchAllConfigs();
      const staffPromise = fetchStaffMembers();
      
      const [configsData, staffData] = await Promise.all([configsPromise, staffPromise]);
      
      console.log(`Loaded ${configsData.length} configurations and ${staffData.length} staff members`);
      
      // Type cast the returned configs to ensure they match our ConfigItem interface
      const typedConfigs: ConfigItem[] = configsData.map(config => ({
        ...config,
        shift_type: config.shift_type as "8h" | "12h"
      }));
      
      setConfigs(typedConfigs);
      setStaffList(staffData);
      
      if (configIdFromUrl && typedConfigs.find(c => c.id === configIdFromUrl)) {
        console.log('Setting config from URL:', configIdFromUrl);
        setSelectedConfigId(configIdFromUrl);
      } else if (configIdFromUrl) {
        console.warn('Config ID from URL not found in loaded configs:', configIdFromUrl);
      }
    } catch (error: any) {
      console.error('Error loading initial data:', error);
      setErrors(prev => ({
        ...prev,
        general: 'Failed to load roster data'
      }));
      toast({
        title: "Error loading data",
        description: error?.message || "Failed to load configurations and staff data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSelectedConfig = async (configId: string) => {
    console.log('Loading selected config details:', configId);
    try {
      const config = await fetchConfigById(configId);
      console.log('Loaded config details:', config);
      
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
      const generatedName = `${config.config_name} - ${monthName} ${year}`;
      console.log('Generated roster name:', generatedName);
      setRosterName(generatedName);
    } catch (error: any) {
      console.error('Error loading selected config:', error);
      setErrors(prev => ({
        ...prev,
        configs: 'Failed to load the selected configuration'
      }));
      toast({
        title: "Error loading configuration",
        description: error?.message || "Failed to load the selected configuration",
        variant: "destructive",
      });
    }
  };

  const validateRosterGeneration = (): boolean => {
    console.log('Validating roster generation inputs', { 
      hasConfig: !!selectedConfig, 
      rosterName, 
      staffCount: staffList.length 
    });
    
    const validationErrors: {
      configs?: string;
      name?: string;
      staff?: string;
    } = {};
    
    if (!selectedConfig) {
      validationErrors.configs = "Please select a configuration first";
    }

    if (!rosterName.trim()) {
      validationErrors.name = "Please enter a roster name";
    }

    if (staffList.length === 0) {
      validationErrors.staff = "No staff members available";
    }
    
    // Update errors state and show toast for first error
    if (Object.keys(validationErrors).length > 0) {
      console.warn('Validation failed for roster generation:', validationErrors);
      setErrors(prev => ({ ...prev, ...validationErrors }));
      
      // Show toast for the first error
      const firstError = Object.values(validationErrors)[0];
      toast({
        title: "Cannot generate roster",
        description: firstError,
        variant: "destructive",
      });
      
      return false;
    }
    
    console.log('Roster generation validation passed');
    return true;
  };

  const handleGenerateRoster = async () => {
    if (!validateRosterGeneration()) {
      return;
    }

    try {
      console.log('Starting roster generation process...', {
        configId: selectedConfig?.id,
        rosterName,
        staffCount: staffList.length
      });
      setIsGenerating(true);
      
      // Convert the config to the format expected by generateAndSaveRoster
      const configForGeneration = {
        id: selectedConfig!.id,
        cycle_length_weeks: selectedConfig!.cycle_length_weeks,
        shift_type: selectedConfig!.shift_type,
        operational_hours_per_day: selectedConfig!.operational_hours_per_day,
        handshake_minutes: selectedConfig!.handshake_minutes,
        start_date: selectedConfig!.start_date
      };

      console.log('Prepared configuration for generation:', configForGeneration);

      // This will be updated when we modify generateAndSaveRoster to accept versionName
      const versionId = await generateAndSaveRosterWithName(
        staffList,
        configForGeneration,
        rosterName.trim()
      );
      
      console.log('Roster generated successfully with version ID:', versionId);
      setGeneratedVersionId(versionId);
      
      toast({
        title: "Roster generated successfully",
        description: `Generated roster: ${rosterName}`,
      });
      
    } catch (error: any) {
      console.error('Error generating roster:', error);
      setErrors(prev => ({
        ...prev,
        general: 'Failed to generate roster'
      }));
      toast({
        title: "Generation failed",
        description: error?.message || "Failed to generate roster. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper function to save roster with name
  const generateAndSaveRosterWithName = async (staffList: any[], config: any, versionName: string) => {
    console.log('Generating and saving roster with name:', versionName);
    try {
      // For now, call the existing function and then update the version name
      const versionId = await generateAndSaveRoster(staffList, config);
      console.log('Roster generated with version ID:', versionId);
      
      // Update the version with the name
      console.log('Updating version name for ID:', versionId);
      const { error } = await supabase.from('roster_versions')
        .update({ version_name: versionName })
        .eq('id', versionId);
        
      if (error) {
        console.error('Error updating version name:', error);
        throw error;
      }
      
      console.log('Version name updated successfully');
      return versionId;
    } catch (error) {
      console.error('Error in generateAndSaveRosterWithName:', error);
      throw error;
    }
  };

  const refreshData = async () => {
    console.log('Manually refreshing roster data');
    await loadInitialData();
    toast({
      title: "Data refreshed",
      description: "Roster data has been refreshed",
    });
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
    errors,
    setSelectedConfigId,
    setRosterName,
    handleGenerateRoster,
    refreshData
  };
};
