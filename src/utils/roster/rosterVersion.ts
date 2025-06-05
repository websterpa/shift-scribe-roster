
import { supabase } from "@/integrations/supabase/client";

export async function createRosterVersion(configId: string, startDate: string, cycleWeeks: number): Promise<string> {
  console.log('Creating roster version for config:', configId);
  
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + cycleWeeks * 7);
  
  const { data: rv, error: rvError } = await supabase
    .from("roster_versions")
    .insert({ 
      config_id: configId,
      start_date: startDate,
      end_date: endDate.toISOString().split('T')[0],
      created_by: 'system', // You might want to pass the actual user ID
      version_number: 1 // This should be calculated based on existing versions
    })
    .select("id, version_number")
    .single();
    
  if (rvError) {
    console.error('Error creating roster version:', rvError);
    throw rvError;
  }
  
  console.log('Created roster version:', rv.id);
  return rv.id;
}
