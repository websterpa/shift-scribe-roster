import { supabase } from "@/integrations/supabase/client";
import { createLogger } from "./errorLogger";

const logger = createLogger('ConfigHelpers');

export interface ConfigData {
  configName: string;
  cycle_length_weeks: number;
  shift_type: "8h" | "12h";
  operational_hours_per_day: number;
  handshake_minutes: number;
  start_date: string;
}

export async function saveConfig({
  configName,
  cycle_length_weeks,
  shift_type,
  operational_hours_per_day,
  handshake_minutes,
  start_date
}: ConfigData) {
  console.log('💾 ConfigHelpers: Saving configuration:', { 
    configName, 
    cycle_length_weeks, 
    shift_type,
    operational_hours_per_day,
    handshake_minutes
  });
  
  // Ensure handshake_minutes is a valid value
  const validHandshakeValues = [0, 15, 30, 45, 60];
  const validHandshake = validHandshakeValues.includes(handshake_minutes) ? handshake_minutes : 0;
  if (validHandshake !== handshake_minutes) {
    console.warn('⚠️ ConfigHelpers: Invalid handshake minutes value, using 0 instead:', handshake_minutes);
  }
  
  try {
    const { data, error } = await supabase
      .from("roster_config")
      .insert({
        config_name: configName,
        cycle_length_weeks,
        shift_type,
        operational_hours_per_day,
        handshake_minutes: validHandshake,
        start_date
      })
      .select("id")
      .single();
      
    if (error) {
      console.error('❌ ConfigHelpers: Failed to save config:', error);
      logger.error(new Error(`Failed to save config: ${error.message}`), { error });
      throw error;
    }
    
    console.log('✅ ConfigHelpers: Configuration saved successfully with ID:', data.id);
    logger.info('Configuration saved successfully', { id: data.id });
    return data.id;
  } catch (error: any) {
    console.error('❌ ConfigHelpers: Exception saving configuration:', error);
    logger.error(new Error('Exception saving configuration'), { originalError: error });
    throw error;
  }
}

export async function updateConfig(
  configId: string,
  fields: Partial<Omit<ConfigData, 'configName'> & { config_name: string }>
) {
  console.log('🔄 ConfigHelpers: Updating configuration:', { configId, fields });
  
  // Ensure handshake_minutes is a valid value if it's being updated
  if (fields.handshake_minutes !== undefined) {
    const validHandshakeValues = [0, 15, 30, 45, 60];
    const validHandshake = validHandshakeValues.includes(fields.handshake_minutes) ? fields.handshake_minutes : 0;
    if (validHandshake !== fields.handshake_minutes) {
      console.warn('⚠️ ConfigHelpers: Invalid handshake minutes value in update, using 0 instead:', fields.handshake_minutes);
      fields.handshake_minutes = validHandshake;
    }
  }
  
  try {
    const { error } = await supabase
      .from("roster_config")
      .update(fields)
      .eq("id", configId);
      
    if (error) {
      console.error('❌ ConfigHelpers: Failed to update config:', error);
      logger.error(new Error(`Failed to update config: ${error.message}`), { error });
      throw error;
    }
    
    console.log('✅ ConfigHelpers: Configuration updated successfully');
    logger.info('Configuration updated successfully', { configId });
    return true;
  } catch (error: any) {
    console.error('❌ ConfigHelpers: Exception updating configuration:', error);
    logger.error(new Error('Exception updating configuration'), { originalError: error });
    throw error;
  }
}

export async function fetchConfigById(configId: string) {
  console.log('📥 ConfigHelpers: Fetching configuration by ID:', configId);
  
  try {
    const { data, error } = await supabase
      .from("roster_config")
      .select("*")
      .eq("id", configId)
      .single();
      
    if (error) {
      console.error('❌ ConfigHelpers: Failed to fetch config:', error);
      logger.error(new Error(`Failed to fetch config: ${error.message}`), { error });
      throw error;
    }
    
    console.log('✅ ConfigHelpers: Configuration fetched successfully:', data.config_name);
    logger.info('Configuration fetched successfully', { configId });
    return data;
  } catch (error: any) {
    console.error('❌ ConfigHelpers: Exception fetching configuration:', error);
    logger.error(new Error('Exception fetching configuration'), { originalError: error });
    throw error;
  }
}

export async function fetchAllConfigs() {
  console.log('📥 ConfigHelpers: Fetching all configurations');
  
  try {
    const { data, error } = await supabase
      .from("roster_config")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (error) {
      console.error('❌ ConfigHelpers: Failed to fetch configs:', error);
      logger.error(new Error(`Failed to fetch configs: ${error.message}`), { error });
      throw error;
    }
    
    console.log('✅ ConfigHelpers: Configurations fetched successfully, count:', data?.length || 0);
    logger.info('Configurations fetched successfully', { count: data?.length || 0 });
    return data || [];
  } catch (error: any) {
    console.error('❌ ConfigHelpers: Exception fetching all configurations:', error);
    logger.error(new Error('Exception fetching all configurations'), { originalError: error });
    throw error;
  }
}

// Create a default configuration if none exists
export async function ensureDefaultConfig() {
  console.log('🔍 ConfigHelpers: Checking for existing configurations...');
  
  try {
    const configs = await fetchAllConfigs();
    
    if (configs.length === 0) {
      console.log('➕ ConfigHelpers: No configurations found, creating default...');
      
      const defaultConfig = {
        configName: "Default CCTV Configuration",
        cycle_length_weeks: 4,
        shift_type: "8h" as "8h" | "12h",
        operational_hours_per_day: 24,
        handshake_minutes: 15, // Valid handshake value
        start_date: getNextMonday()
      };
      
      const configId = await saveConfig(defaultConfig);
      console.log('✅ ConfigHelpers: Default configuration created with ID:', configId);
      return configId;
    } else {
      console.log('✅ ConfigHelpers: Existing configurations found, no default needed');
      return null;
    }
  } catch (error: any) {
    console.error('❌ ConfigHelpers: Error ensuring default config:', error);
    throw error;
  }
}

function getNextMonday() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  return nextMonday.toISOString().split('T')[0];
}
