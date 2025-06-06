
import { supabase } from "@/integrations/supabase/client";
import { createLogger } from "../errorLogger";

const logger = createLogger('RosterVersion');

export async function createRosterVersion(configId: string, versionName?: string, startDate?: string, cycleWeeks?: number): Promise<string> {
  try {
    if (!configId) {
      throw new Error('Config ID is required to create roster version');
    }

    logger.info('Creating roster version for config:', configId);
    
    // Prepare end date calculation if start date and cycle weeks are provided
    let endDateValue = undefined;
    if (startDate && cycleWeeks) {
      try {
        const endDate = new Date(startDate);
        if (isNaN(endDate.getTime())) {
          throw new Error('Invalid start date provided');
        }
        endDate.setDate(endDate.getDate() + cycleWeeks * 7);
        endDateValue = endDate.toISOString().split('T')[0];
        logger.info('Calculated end date:', endDateValue);
      } catch (dateError) {
        logger.error(new Error('Error calculating end date'), { error: dateError, startDate, cycleWeeks });
        throw new Error('Failed to calculate end date');
      }
    }
    
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
    
    // Prepare version data
    const versionData: any = { 
      config_id: configId,
      version_number: nextVersionNumber
    };
    
    // Add version name if provided
    if (versionName && versionName.trim()) {
      versionData.version_name = versionName.trim();
      logger.info('Including version name:', versionName.trim());
    } else {
      versionData.version_name = `Version ${nextVersionNumber}`;
      logger.info('Using default version name:', versionData.version_name);
    }
    
    // Add start date and end date if provided
    if (startDate) {
      // Validate start date
      const startDateObj = new Date(startDate);
      if (isNaN(startDateObj.getTime())) {
        throw new Error('Invalid start date format');
      }
      versionData.start_date = startDate;
      logger.info('Including start date:', startDate);
    }
    
    if (endDateValue) {
      versionData.end_date = endDateValue;
      logger.info('Including end date:', endDateValue);
    }
    
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
