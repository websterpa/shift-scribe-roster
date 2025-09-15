import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllConfigs, fetchConfigById } from '@/utils/configHelpers';
import { fetchStaffMembers, generateAndSaveRoster } from '@/utils/roster/rosterGeneration';
import { ConfigItem, StaffMember } from '@/types/roster';
import { createLogger } from '@/utils/errorLogger';
import { useSearchParams } from 'react-router-dom';

const logger = createLogger('useRosterGeneration');

interface StaffingRequirements {
  day_shift_staff?: number;
  night_shift_staff?: number;
  early_shift_staff?: number;
  late_shift_staff?: number;
}

export const useRosterGeneration = (configIdFromUrl: string | null) => {
  console.log('🔄 useRosterGeneration hook initialized with configId:', configIdFromUrl);
  
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>(configIdFromUrl || '');
  const [selectedConfig, setSelectedConfig] = useState<ConfigItem | null>(null);
  const [rosterName, setRosterName] = useState('');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [generatedVersionId, setGeneratedVersionId] = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<string[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationTimeRemaining, setOptimizationTimeRemaining] = useState<number | undefined>(undefined);
  const [errors, setErrors] = useState<{
    configs?: string;
    staff?: string;
    name?: string;
    general?: string;
  }>({});
  const [validationReport, setValidationReport] = useState<import('@/utils/roster/staffingValidation').StaffingValidationReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    console.log('🔄 useRosterGeneration: Initial data load effect triggered');
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedConfigId) {
      console.log('🔄 useRosterGeneration: Selected config ID changed to:', selectedConfigId);
      loadSelectedConfig(selectedConfigId);
    } else {
      console.log('🔄 useRosterGeneration: No config selected, clearing selection');
      setSelectedConfig(null);
    }
  }, [selectedConfigId]);

  const loadInitialData = async () => {
    console.log('📊 useRosterGeneration: Loading initial data...');
    try {
      setIsLoading(true);
      setErrors({});
      
      console.log('📊 Fetching configs and staff in parallel...');
      const [configsData, staffData] = await Promise.all([
        fetchAllConfigs(),
        fetchStaffMembers()
      ]);
      
      console.log('✅ useRosterGeneration: Loaded data:', {
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
        console.log('✅ useRosterGeneration: Setting config from URL:', configIdFromUrl);
        setSelectedConfigId(configIdFromUrl);
      }
    } catch (error: any) {
      console.error('❌ useRosterGeneration: Error loading initial data:', error);
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
    console.log('📊 useRosterGeneration: Loading selected config:', configId);
    try {
      const config = await fetchConfigById(configId);
      console.log('✅ useRosterGeneration: Loaded config:', config.config_name);
      
      // Safely cast the staffing_requirements JSON to our interface
      const staffingReqs = config.staffing_requirements as StaffingRequirements | null;
      
      const typedConfig: ConfigItem = {
        ...config,
        shift_type: config.shift_type as "8h" | "12h",
        // Extract staffing requirements from the staffing_requirements JSON field
        day_shift_staff: staffingReqs?.day_shift_staff,
        night_shift_staff: staffingReqs?.night_shift_staff,
        early_shift_staff: staffingReqs?.early_shift_staff,
        late_shift_staff: staffingReqs?.late_shift_staff,
      };
      setSelectedConfig(typedConfig);
      
      // Auto-generate roster name
      const today = new Date();
      const monthName = today.toLocaleDateString('en-US', { month: 'long' });
      const year = today.getFullYear();
      const generatedName = `${config.config_name} - ${monthName} ${year}`;
      setRosterName(generatedName);
      console.log('✅ useRosterGeneration: Generated roster name:', generatedName);

      // Trigger staffing validation when config and staff are both loaded
      if (staffList.length > 0) {
        await validateStaffing(typedConfig, staffList);
      }
    } catch (error: any) {
      console.error('❌ useRosterGeneration: Error loading config:', error);
      setErrors(prev => ({
        ...prev,
        configs: 'Failed to load the selected configuration'
      }));
    }
  };

  const validateStaffing = async (config: ConfigItem, staff: StaffMember[]) => {
    console.log('🔍 Starting staffing validation...');
    setIsValidating(true);
    
    try {
      const { validateStaffingRequirements } = await import('@/utils/roster/staffingValidation');
      const report = validateStaffingRequirements(staff, config);
      
      setValidationReport(report);
      console.log('✅ Staffing validation completed:', { isValid: report.isValid });
      
      // Update errors based on validation
      if (!report.isValid) {
        setErrors(prev => ({
          ...prev,
          general: 'Staffing requirements not met - see validation report below'
        }));
      } else {
        setErrors(prev => {
          const { general, ...rest } = prev;
          return rest;
        });
      }
    } catch (error: any) {
      console.error('❌ Error during staffing validation:', error);
      setErrors(prev => ({
        ...prev,
        general: 'Failed to validate staffing requirements'
      }));
    } finally {
      setIsValidating(false);
    }
  };

  // Update when staffList changes and we have a selected config
  useEffect(() => {
    if (selectedConfig && staffList.length > 0) {
      validateStaffing(selectedConfig, staffList);
    }
  }, [staffList, selectedConfig]);

  const handleGenerateRoster = async () => {
    console.log('🚀 useRosterGeneration: handleGenerateRoster called');
    console.log('📊 Current state:', {
      selectedConfig: selectedConfig?.config_name,
      rosterName,
      staffCount: staffList.length,
      selectedPattern: selectedPattern.length > 0 ? selectedPattern : 'none'
    });

    // Validation
    if (!selectedConfig) {
      const error = "Please select a configuration first";
      console.warn('⚠️ useRosterGeneration: Validation failed:', error);
      toast({
        title: "Cannot generate roster",
        description: error,
        variant: "destructive",
      });
      return;
    }

    if (!rosterName.trim()) {
      const error = "Roster name is required";
      console.warn('⚠️ useRosterGeneration: Validation failed:', error);
      toast({
        title: "Cannot generate roster",
        description: error,
        variant: "destructive",
      });
      return;
    }

    if (staffList.length === 0) {
      const error = "No staff members available";
      console.warn('⚠️ useRosterGeneration: Validation failed:', error);
      toast({
        title: "Cannot generate roster",
        description: error,
        variant: "destructive",
      });
      return;
    }

    // Check validation report
    if (validationReport && !validationReport.isValid) {
      const error = "Staffing requirements not met. Please review the validation report and add more staff or adjust requirements.";
      console.warn('⚠️ useRosterGeneration: Staffing validation failed:', validationReport);
      toast({
        title: "Cannot generate roster",
        description: error,
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🚀 useRosterGeneration: Starting roster generation...');
      setIsGenerating(true);
      setIsOptimizing(true);
      setOptimizationTimeRemaining(5.0);
      setErrors({});
      
      // Start countdown timer for optimization UI
      const optimizationTimer = setInterval(() => {
        setOptimizationTimeRemaining(prev => {
          if (prev === undefined || prev <= 0) {
            clearInterval(optimizationTimer);
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
      
      const configForGeneration = {
        id: selectedConfig.id,
        cycle_length_weeks: selectedConfig.cycle_length_weeks,
        shift_type: selectedConfig.shift_type,
        operational_hours_per_day: selectedConfig.operational_hours_per_day,
        handshake_minutes: selectedConfig.handshake_minutes,
        start_date: selectedConfig.start_date,
        // FIXED: Always include the selected pattern if one is available
        ...(selectedPattern.length > 0 && { pattern: selectedPattern }),
        // Add staffing requirements from the selected config
        staffing_requirements: {
          day_shift_staff: selectedConfig.day_shift_staff || 0,
          night_shift_staff: selectedConfig.night_shift_staff || 0,
          early_shift_staff: selectedConfig.early_shift_staff || 0,
          late_shift_staff: selectedConfig.late_shift_staff || 0,
        }
      };

      console.log('📊 useRosterGeneration: Config for generation:', configForGeneration);
      console.log('📊 useRosterGeneration: Staff list:', staffList.map(s => ({ id: s.id, name: s.name })));

      const result = await generateAndSaveRoster(
        staffList,
        configForGeneration,
        rosterName.trim()
      );
      
      console.log('✅ useRosterGeneration: Roster generated successfully, result:', result);
      setGeneratedVersionId(result.versionId);
      
      // Clear optimization status
      setIsOptimizing(false);
      setOptimizationTimeRemaining(undefined);
      
      toast({
        title: "Roster generated successfully",
        description: `Generated roster: "${rosterName.trim()}"${selectedPattern.length > 0 ? ` with ${selectedPattern.length}-day pattern` : ''}`,
      });
      
    } catch (error: any) {
      console.error('❌ useRosterGeneration: Error generating roster:', error);
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
      setIsOptimizing(false);
      setOptimizationTimeRemaining(undefined);
    }
  };

  const refreshData = async () => {
    console.log('🔄 useRosterGeneration: Refreshing data...');
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
    selectedPattern,
    isOptimizing,
    optimizationTimeRemaining,
    setSelectedConfigId,
    setRosterName,
    setSelectedPattern,
    handleGenerateRoster,
    refreshData,
    validationReport,
    isValidating
  };
};
