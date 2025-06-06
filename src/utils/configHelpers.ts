
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
  logger.info('Saving configuration', { 
    configName, 
    cycle_length_weeks, 
    shift_type,
    operational_hours_per_day
  });
  
  try {
    const { data, error } = await supabase
      .from("roster_config")
      .insert({
        config_name: configName,
        cycle_length_weeks,
        shift_type,
        operational_hours_per_day,
        handshake_minutes,
        start_date
      })
      .select("id")
      .single();
      
    if (error) {
      logger.error(new Error(`Failed to save config: ${error.message}`), { error });
      throw error;
    }
    
    logger.info('Configuration saved successfully', { id: data.id });
    return data.id;
  } catch (error: any) {
    logger.error(new Error('Exception saving configuration'), { originalError: error });
    throw error;
  }
}

export async function updateConfig(
  configId: string,
  fields: Partial<Omit<ConfigData, 'configName'> & { config_name: string }>
) {
  logger.info('Updating configuration', { configId, fields });
  
  try {
    const { error } = await supabase
      .from("roster_config")
      .update(fields)
      .eq("id", configId);
      
    if (error) {
      logger.error(new Error(`Failed to update config: ${error.message}`), { error });
      throw error;
    }
    
    logger.info('Configuration updated successfully', { configId });
    return true;
  } catch (error: any) {
    logger.error(new Error('Exception updating configuration'), { originalError: error });
    throw error;
  }
}

export async function fetchConfigById(configId: string) {
  logger.info('Fetching configuration by ID', { configId });
  
  try {
    const { data, error } = await supabase
      .from("roster_config")
      .select("*")
      .eq("id", configId)
      .single();
      
    if (error) {
      logger.error(new Error(`Failed to fetch config: ${error.message}`), { error });
      throw error;
    }
    
    logger.info('Configuration fetched successfully', { configId });
    return data;
  } catch (error: any) {
    logger.error(new Error('Exception fetching configuration'), { originalError: error });
    throw error;
  }
}

export async function fetchAllConfigs() {
  logger.info('Fetching all configurations');
  
  try {
    const { data, error } = await supabase
      .from("roster_config")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (error) {
      logger.error(new Error(`Failed to fetch configs: ${error.message}`), { error });
      throw error;
    }
    
    logger.info('Configurations fetched successfully', { count: data?.length || 0 });
    return data || [];
  } catch (error: any) {
    logger.error(new Error('Exception fetching all configurations'), { originalError: error });
    throw error;
  }
}
