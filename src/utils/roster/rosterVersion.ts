
import { supabase } from "@/integrations/supabase/client";
import { createLogger } from "../errorLogger";

const logger = createLogger('RosterVersion');

export async function createRosterVersion(
  configId: string, 
  versionName?: string, 
  startDate?: string, 
  cycleWeeks?: number
): Promise<string> {
  try {
    if (!configId) {
      throw new Error('Config ID is required to create roster version');
    }

    logger.info('Creating roster version for config:', configId);
    
    // Get next version number
    const { data: existingVersions, error: versionQueryError } = await supabase
      .from("roster_versions")
      .select("version_number")
      .eq("config_id", configId)
      .order("version_number", { ascending: false })
      .limit(1);

    if (versionQueryError) {
      logger.error(new Error('Error querying existing versions'), { error: versionQueryError });
      throw versionQueryError;
    }
      
    const nextVersionNumber = existingVersions && existingVersions.length > 0 
      ? existingVersions[0].version_number + 1 
      : 1;
    
    // Prepare version data - only use columns that exist in the database
    const versionData: any = { 
      config_id: configId,
      version_number: nextVersionNumber
    };
    
    // Add version name - either provided or default
    if (versionName && versionName.trim()) {
      versionData.version_name = versionName.trim();
      logger.info('Including version name:', versionName.trim());
    } else {
      versionData.version_name = `Version ${nextVersionNumber}`;
      logger.info('Using default version name:', versionData.version_name);
    }
    
    // Note: Removed start_date and end_date as they don't exist in roster_versions table
    // The start_date is stored in the roster_config table instead
    
    // Insert the version
    const { data: rv, error: rvError } = await supabase
      .from("roster_versions")
      .insert(versionData)
      .select("id, version_number")
      .single();
      
    if (rvError) {
      logger.error(new Error('Error creating roster version'), { error: rvError });
      throw rvError;
    }

    if (!rv || !rv.id) {
      throw new Error('Failed to get roster version data from database');
    }
    
    logger.info('Created roster version:', { id: rv.id, versionNumber: rv.version_number });
    return rv.id;
  } catch (error: any) {
    logger.error(new Error('Failed to create roster version'), { error, configId, versionName });
    throw new Error(`Failed to create roster version: ${error.message}`);
  }
}
