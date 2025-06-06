
import { supabase } from "@/integrations/supabase/client";

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
  console.log('Saving configuration:', { configName, cycle_length_weeks, shift_type });
  
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
    console.error('Error saving config:', error);
    throw error;
  }
  
  console.log('Configuration saved with ID:', data.id);
  return data.id;
}

export async function updateConfig(
  configId: string,
  fields: Partial<Omit<ConfigData, 'configName'> & { config_name: string }>
) {
  console.log('Updating configuration:', configId, fields);
  
  const { error } = await supabase
    .from("roster_config")
    .update(fields)
    .eq("id", configId);
    
  if (error) {
    console.error('Error updating config:', error);
    throw error;
  }
  
  console.log('Configuration updated successfully');
  return true;
}

export async function fetchConfigById(configId: string) {
  console.log('Fetching configuration by ID:', configId);
  
  const { data, error } = await supabase
    .from("roster_config")
    .select("*")
    .eq("id", configId)
    .single();
    
  if (error) {
    console.error('Error fetching config:', error);
    throw error;
  }
  
  return data;
}

export async function fetchAllConfigs() {
  console.log('Fetching all configurations');
  
  const { data, error } = await supabase
    .from("roster_config")
    .select("*")
    .order("created_at", { ascending: false });
    
  if (error) {
    console.error('Error fetching configs:', error);
    throw error;
  }
  
  return data || [];
}
