import { supabase } from '@/integrations/supabase/client';
import { createLogger } from './errorLogger';
import { getTenantId } from '@/features/tenant/useTenant';

const logger = createLogger('configHelpers');

export interface ConfigData {
  configName: string;
  cycle_length_weeks: number;
  shift_type: '8h' | '12h';
  operational_hours_per_day: number;
  handshake_minutes: 0 | 15 | 30 | 45 | 60;
  start_date: string;
  site_start_time?: string;
  timezone?: string;
  default_ot_hours?: number;
  default_ot_start_local_time?: string;
  pattern?: string[];
  standard_contract_hours?: number;
  staffing_requirements?: {
    day_shift_staff?: number;
    night_shift_staff?: number;
    early_shift_staff?: number;
    late_shift_staff?: number;
  };
}

export const fetchAllConfigs = async () => {
  console.log('📥 configHelpers: Fetching all configurations...');
  
  const { data, error } = await supabase
    .from('roster_config')
    .select('*')
    .not('config_name', 'like', 'Wizard Temp Config%') // Filter out wizard temp configs
    .eq('tenant_id', getTenantId())
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ configHelpers: Error fetching configurations:', error);
    throw error;
  }
  
  console.log('✅ configHelpers: Successfully fetched configurations:', data?.length || 0);
  return data || [];
};

export const fetchConfigById = async (configId: string) => {
  console.log('📥 configHelpers: Fetching configuration by ID:', configId);
  
  const { data, error } = await supabase
    .from('roster_config')
    .select('*')
    .eq('id', configId)
    .eq('tenant_id', getTenantId())
    .single();
  
  if (error) {
    console.error('❌ configHelpers: Error fetching configuration:', error);
    throw error;
  }
  
  console.log('✅ configHelpers: Successfully fetched configuration:', data?.config_name);
  return data;
};

export const saveConfig = async (configData: ConfigData): Promise<string> => {
  console.log('💾 configHelpers: Saving configuration...', configData.configName);
  
  // Create new config
  const { data, error } = await supabase
    .from('roster_config')
    .insert({
      config_name: configData.configName,
      cycle_length_weeks: configData.cycle_length_weeks,
      shift_type: configData.shift_type,
      operational_hours_per_day: configData.operational_hours_per_day,
      handshake_minutes: configData.handshake_minutes,
      start_date: configData.start_date,
      site_start_time: configData.site_start_time || '07:00',
      timezone: configData.timezone || 'Europe/London',
      default_ot_hours: configData.default_ot_hours,
      default_ot_start_local_time: configData.default_ot_start_local_time,
      standard_contract_hours: configData.standard_contract_hours ?? 37.5,
      staffing_requirements: configData.staffing_requirements || {
        day_shift_staff: 2,
        night_shift_staff: 2,
        early_shift_staff: 1,
        late_shift_staff: 1
      },
      pattern: configData.pattern || [],
      tenant_id: getTenantId(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ configHelpers: Error creating configuration:', error);
    throw error;
  }
  
  console.log('✅ configHelpers: Successfully created configuration');
  return data.id;
};

export const updateConfig = async (configId: string, configData: any) => {
  console.log('🔄 configHelpers: Updating configuration...', configId);
  
  const { data, error } = await supabase
    .from('roster_config')
    .update({
      config_name: configData.config_name,
      cycle_length_weeks: configData.cycle_length_weeks,
      shift_type: configData.shift_type,
      operational_hours_per_day: configData.operational_hours_per_day,
      handshake_minutes: configData.handshake_minutes,
      start_date: configData.start_date,
      site_start_time: configData.site_start_time,
      timezone: configData.timezone,
      default_ot_hours: configData.default_ot_hours,
      default_ot_start_local_time: configData.default_ot_start_local_time,
      standard_contract_hours: configData.standard_contract_hours,
      staffing_requirements: configData.staffing_requirements,
      pattern: configData.pattern
    })
    .eq('id', configId)
    .eq('tenant_id', getTenantId())
    .select()
    .single();
  
  if (error) {
    console.error('❌ configHelpers: Error updating configuration:', error);
    throw error;
  }
  
  console.log('✅ configHelpers: Successfully updated configuration');
  return data;
};

export const ensureDefaultConfig = async () => {
  console.log('🔍 configHelpers: Ensuring default configuration exists...');
  
  try {
    // Check if any configuration exists (excluding wizard temp configs)
    const { data: existingConfigs, error: fetchError } = await supabase
      .from('roster_config')
      .select('id')
      .not('config_name', 'like', 'Wizard Temp Config%')
      .eq('tenant_id', getTenantId())
      .limit(1);
    
    if (fetchError) {
      console.error('❌ configHelpers: Error checking existing configs:', fetchError);
      throw fetchError;
    }
    
    if (!existingConfigs || existingConfigs.length === 0) {
      console.log('➕ configHelpers: No configurations found, creating default...');
      
      // Create default configuration
      const defaultConfig: ConfigData = {
        configName: 'Default CCTV Configuration',
        cycle_length_weeks: 4,
        shift_type: '8h',
        operational_hours_per_day: 24,
        handshake_minutes: 0,
        start_date: getNextMonday(),
        site_start_time: '07:00',
        timezone: 'Europe/London',
        default_ot_hours: 4,
        default_ot_start_local_time: '10:00',
        standard_contract_hours: 37.5,
        staffing_requirements: {
          day_shift_staff: 2,
          night_shift_staff: 2,
          early_shift_staff: 1,
          late_shift_staff: 1
        },
        pattern: []
      };
      
      await saveConfig(defaultConfig);
      console.log('✅ configHelpers: Default configuration created');
    } else {
      console.log('✅ configHelpers: Configuration already exists, skipping default creation');
    }
  } catch (error) {
    console.error('❌ configHelpers: Exception ensuring default config:', error);
    throw error;
  }
};

const getNextMonday = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  return nextMonday.toISOString().split('T')[0];
};

// Helper function to clean up temporary wizard configurations
export const cleanupTempConfigs = async () => {
  console.log('🧹 configHelpers: Cleaning up temporary wizard configurations...');
  
  try {
    // First get all temp configs
    const { data: tempConfigs, error: fetchError } = await supabase
      .from('roster_config')
      .select('id')
      .like('config_name', 'Wizard Temp Config%');
    
    if (fetchError) {
      console.error('❌ configHelpers: Error fetching temp configs:', fetchError);
      return;
    }
    
    if (!tempConfigs || tempConfigs.length === 0) {
      console.log('✅ configHelpers: No temporary configurations to clean up');
      return;
    }
    
    console.log(`🧹 configHelpers: Found ${tempConfigs.length} temporary configurations to clean up`);
    
    // Delete associated roster data for each temp config
    for (const config of tempConfigs) {
      // Get roster versions for this config
      const { data: versions, error: versionsError } = await supabase
        .from('roster_versions')
        .select('id')
        .eq('config_id', config.id);
      
      if (versionsError) {
        console.error('❌ configHelpers: Error fetching roster versions:', versionsError);
        continue;
      }
      
      // Delete roster assignments for all versions
      if (versions && versions.length > 0) {
        for (const version of versions) {
          const { error: assignmentsError } = await supabase
            .from('roster_assignments')
            .delete()
            .eq('version_id', version.id);
          
          if (assignmentsError) {
            console.error('❌ configHelpers: Error deleting assignments:', assignmentsError);
          }
        }
        
        // Delete roster versions
        const { error: versionsDeleteError } = await supabase
          .from('roster_versions')
          .delete()
          .eq('config_id', config.id);
        
        if (versionsDeleteError) {
          console.error('❌ configHelpers: Error deleting roster versions:', versionsDeleteError);
        }
      }
    }
    
    // Finally delete the temp configs
    const { error: deleteError } = await supabase
      .from('roster_config')
      .delete()
      .like('config_name', 'Wizard Temp Config%');
    
    if (deleteError) {
      console.error('❌ configHelpers: Error deleting temp configurations:', deleteError);
      throw deleteError;
    }
    
    console.log('✅ configHelpers: Successfully cleaned up temporary configurations');
  } catch (error) {
    console.error('❌ configHelpers: Exception during cleanup:', error);
    throw error;
  }
};
