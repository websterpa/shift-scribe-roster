
import { supabase } from '@/integrations/supabase/client';
import { RosterConfig } from './types';

export const createTempConfig = async (config: RosterConfig): Promise<string> => {
  console.log('📋 NewRosterWizard: Creating temporary config for wizard generation');
  
  try {
    const tempConfig = {
      config_name: `Wizard Temp Config - ${Date.now()}`,
      cycle_length_weeks: Math.ceil(config.cycleLength / 7),
      shift_type: config.shiftType,
      operational_hours_per_day: config.operationalWindow === '24h' ? 24 : 
                                 config.operationalWindow === '16h' ? 16 : 
                                 config.customHours || 24,
      handshake_minutes: 15,
      start_date: config.startDate,
      staffing_requirements: config.staffingRequirements as any
    };

    const { data, error } = await supabase
      .from('roster_config')
      .insert(tempConfig)
      .select('id')
      .single();

    if (error) {
      console.error('❌ NewRosterWizard: Error creating temp config:', error);
      throw error;
    }

    if (!data?.id) {
      throw new Error('Failed to get temp config ID');
    }

    console.log('✅ NewRosterWizard: Created temp config with ID:', data.id);
    return data.id;
  } catch (error: any) {
    console.error('❌ NewRosterWizard: Failed to create temp config:', error);
    throw new Error(`Failed to create temporary configuration: ${error.message}`);
  }
};

export const cleanupTempConfig = async (configId: string) => {
  try {
    console.log('🧹 NewRosterWizard: Cleaning up temp config:', configId);
    await supabase
      .from('roster_config')
      .delete()
      .eq('id', configId);
    console.log('✅ NewRosterWizard: Temp config cleaned up');
  } catch (error) {
    console.error('❌ NewRosterWizard: Error cleaning up temp config:', error);
    // Non-critical error, don't throw
  }
};

export const isStepValid = (currentStep: number, config: RosterConfig): boolean => {
  switch (currentStep) {
    case 1:
      return Boolean(config.shiftType) && Boolean(config.operationalWindow);
    case 2:
      return config.cycleLength > 0 && config.startDate !== '';
    case 3:
      return Boolean(config.template) && Boolean(config.rosterName.trim());
    default:
      return false;
  }
};
