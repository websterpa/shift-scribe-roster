
import { supabase } from "@/integrations/supabase/client";

export async function createRosterVersion(configId: string, versionName?: string, startDate?: string, cycleWeeks?: number): Promise<string> {
  console.log('Creating roster version for config:', configId);
  
  // Prepare end date calculation if start date and cycle weeks are provided
  let endDateValue = undefined;
  if (startDate && cycleWeeks) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + cycleWeeks * 7);
    endDateValue = endDate.toISOString().split('T')[0];
  }
  
  // Get next version number
  const { data: existingVersions, error: versionQueryError } = await supabase
    .from("roster_versions")
    .select("version_number")
    .eq("config_id", configId)
    .order("version_number", { ascending: false })
    .limit(1);

  if (versionQueryError) {
    console.error('Error querying existing versions:', versionQueryError);
    throw versionQueryError;
  }
    
  const nextVersionNumber = existingVersions && existingVersions.length > 0 
    ? existingVersions[0].version_number + 1 
    : 1;
  
  // Prepare version data
  const versionData: any = { 
    config_id: configId,
    version_number: nextVersionNumber
  };
  
  // Add version name if provided
  if (versionName && versionName.trim()) {
    versionData.version_name = versionName.trim();
  } else {
    versionData.version_name = `Version ${nextVersionNumber}`;
  }
  
  // Add start date and end date if provided
  if (startDate) {
    versionData.start_date = startDate;
  }
  
  if (endDateValue) {
    versionData.end_date = endDateValue;
  }
  
  // Insert the version
  const { data: rv, error: rvError } = await supabase
    .from("roster_versions")
    .insert(versionData)
    .select("id, version_number")
    .single();
    
  if (rvError) {
    console.error('Error creating roster version:', rvError);
    throw rvError;
  }
  
  console.log('Created roster version:', rv.id, 'with version number:', rv.version_number);
  return rv.id;
}
