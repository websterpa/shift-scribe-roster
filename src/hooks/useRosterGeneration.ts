
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllConfigs, fetchConfigById } from '@/utils/configHelpers';
import { fetchStaffMembers, generateAndSaveRoster } from '@/utils/roster/rosterGeneration';
import { ConfigItem, StaffMember } from '@/types/roster';
import { createLogger } from '@/utils/errorLogger';

const logger = createLogger('useRosterGeneration');

export const useRosterGeneration = (configIdFromUrl: string | null) => {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>(configIdFromUrl || '');
  const [selectedConfig, setSelectedConfig] = useState<ConfigItem | null>(null);
  const [rosterName, setRosterName] = useState('');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [generatedVersionId, setGeneratedVersionId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    configs?: string;
    staff?: string;
    name?: string;
    general?: string;
  }>({});

  useEffect(() => {
    console.log('🔄 useRosterGeneration hook initialized');
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedConfigId) {
      console.log('🔄 Selected config ID changed:', selectedConfigId);
      loadSelectedConfig(selectedConfigId);
    } else {
      setSelectedConfig(null);
    }
  }, [selectedConfigId]);

  const loadInitialData = async () => {
    console.log('📊 Loading initial data for roster generation...');
    try {
      setIsLoading(true);
      setErrors({});
      
      console.log('📊 Fetching configs and staff...');
      const [configsData, staffData] = await Promise.all([
        fetchAllConfigs(),
        fetchStaffMembers()
      ]);
      
      console.log('✅ Loaded data:', {
        configs: configsData.length,
        staff: staffData.length
      });
      
      const typedConfigs: ConfigItem[] = configsData.map(config => ({
        ...config,
        shift_type: config.shift_type as "8h" | "12h"
      }));
      
      setConfigs(typedConfigs);
      setStaffList(staffData);
      
      if (configIdFromUrl && typedConfigs.find(c => c.id === configIdFromUrl)) {
        setSelectedConfigId(configIdFromUrl);
      }
    } catch (error: any) {
      console.error('❌ Error loading initial data:', error);
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
    console.log('📊 Loading selected config:', configId);
    try {
      const config = await fetchConfigById(configId);
      console.log('✅ Loaded config:', config);
      
      const typedConfig: ConfigItem = {
        ...config,
        shift_type: config.shift_type as "8h" | "12h"
      };
      setSelectedConfig(typedConfig);
      
      // Auto-generate roster name
      const today = new Date();
      const monthName = today.toLocaleDateString('en-US', { month: 'long' });
      const year = today.getFullYear();
      const generatedName = `${config.config_name} - ${monthName} ${year}`;
      setRosterName(generatedName);
      console.log('✅ Generated roster name:', generatedName);
    } catch (error: any) {
      console.error('❌ Error loading config:', error);
      setErrors(prev => ({
        ...prev,
        configs: 'Failed to load the selected configuration'
      }));
    }
  };

  const handleGenerateRoster = async () => {
    console.log('🚀 handleGenerateRoster called');
    console.log('📊 Current state:', {
      selectedConfig: selectedConfig?.config_name,
      rosterName,
      staffCount: staffList.length
    });

    // Validation
    if (!selectedConfig) {
      const error = "Please select a configuration first";
      console.warn('⚠️ Validation failed:', error);
      toast({
        title: "Cannot generate roster",
        description: error,
        variant: "destructive",
      });
      return;
    }

    if (!rosterName.trim()) {
      const error = "Roster name is required";
      console.warn('⚠️ Validation failed:', error);
      toast({
        title: "Cannot generate roster",
        description: error,
        variant: "destructive",
      });
      return;
    }

    if (staffList.length === 0) {
      const error = "No staff members available";
      console.warn('⚠️ Validation failed:', error);
      toast({
        title: "Cannot generate roster",
        description: error,
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🚀 Starting roster generation...');
      setIsGenerating(true);
      setErrors({});
      
      const configForGeneration = {
        id: selectedConfig.id,
        cycle_length_weeks: selectedConfig.cycle_length_weeks,
        shift_type: selectedConfig.shift_type,
        operational_hours_per_day: selectedConfig.operational_hours_per_day,
        handshake_minutes: selectedConfig.handshake_minutes,
        start_date: selectedConfig.start_date
      };

      console.log('📊 Config for generation:', configForGeneration);
      console.log('📊 Staff list:', staffList.map(s => ({ id: s.id, name: s.name })));

      const versionId = await generateAndSaveRoster(
        staffList,
        configForGeneration,
        rosterName.trim()
      );
      
      console.log('✅ Roster generated successfully, version ID:', versionId);
      setGeneratedVersionId(versionId);
      
      toast({
        title: "Roster generated successfully",
        description: `Generated roster: "${rosterName.trim()}"`,
      });
      
    } catch (error: any) {
      console.error('❌ Error generating roster:', error);
      setErrors(prev => ({
        ...prev,
        general: error?.message || 'Failed to generate roster'
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

  const refreshData = async () => {
    console.log('🔄 Refreshing data...');
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
