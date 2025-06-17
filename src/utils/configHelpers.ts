
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from './errorLogger';

const logger = createLogger('configHelpers');

export const fetchAllConfigs = async () => {
  console.log('📥 configHelpers: Fetching all configurations...');
  
  const { data, error } = await supabase
    .from('roster_config')
    .select('*')
    .not('config_name', 'like', 'Wizard Temp Config%') // Filter out wizard temp configs
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
    .single();
  
  if (error) {
    console.error('❌ configHelpers: Error fetching configuration:', error);
    throw error;
  }
  
  console.log('✅ configHelpers: Successfully fetched configuration:', data?.config_name);
  return data;
};

export const saveConfig = async (configData: any) => {
  console.log('💾 configHelpers: Saving configuration...', configData.config_name);
  
  if (configData.id) {
    // Update existing config
    const { data, error } = await supabase
      .from('roster_config')
      .update({
        config_name: configData.config_name,
        cycle_length_weeks: configData.cycle_length_weeks,
        shift_type: configData.shift_type,
        operational_hours_per_day: configData.operational_hours_per_day,
        handshake_minutes: configData.handshake_minutes,
        start_date: configData.start_date,
        staffing_requirements: configData.staffing_requirements
      })
      .eq('id', configData.id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ configHelpers: Error updating configuration:', error);
      throw error;
    }
    
    console.log('✅ configHelpers: Successfully updated configuration');
    return data;
  } else {
    // Create new config
    const { data, error } = await supabase
      .from('roster_config')
      .insert({
        config_name: configData.config_name,
        cycle_length_weeks: configData.cycle_length_weeks,
        shift_type: configData.shift_type,
        operational_hours_per_day: configData.operational_hours_per_day,
        handshake_minutes: configData.handshake_minutes,
        start_date: configData.start_date,
        staffing_requirements: configData.staffing_requirements
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ configHelpers: Error creating configuration:', error);
      throw error;
    }
    
    console.log('✅ configHelpers: Successfully created configuration');
    return data;
  }
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
