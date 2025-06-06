
import { supabase } from "@/integrations/supabase/client";
import { generateAndSaveRoster } from "./rosterGeneration";
import { fetchStaffMembers } from "./staffHelpers";
import { createLogger } from "../errorLogger";

const logger = createLogger('ContinueRoster');

/**
 * Continues a roster pattern by creating a new version that starts where the previous one ended
 */
export async function continueRoster(configId: string): Promise<string> {
  logger.info('Starting roster continuation...', { configId });

  try {
    // 1. Fetch config record
    const { data: config, error: configError } = await supabase
      .from("roster_config")
      .select("*")
      .eq("id", configId)
      .single();

    if (configError) {
      logger.error(new Error('Failed to fetch config'), { error: configError });
      throw configError;
    }

    logger.info('Fetched config:', config);

    // 2. Find last version number for this config
    const { data: lastVersion, error: versionError } = await supabase
      .from("roster_versions")
      .select("version_number")
      .eq("config_id", configId)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    if (versionError) {
      logger.error(new Error('Failed to fetch last version'), { error: versionError });
      throw versionError;
    }

    const nextVersionNumber = lastVersion.version_number + 1;
    logger.info('Next version number:', nextVersionNumber);

    // 3. Compute new start date: original start + cycle_length_weeks * 7 * (nextVersion - 1)
    const baseDate = new Date(config.start_date);
    baseDate.setDate(
      baseDate.getDate() + 
      config.cycle_length_weeks * 7 * (nextVersionNumber - 1)
    );
    const newStartDate = baseDate.toISOString().split("T")[0];
    
    logger.info('Calculated new start date:', newStartDate);

    // 4. Fetch staff members
    const staffList = await fetchStaffMembers();
    logger.info('Fetched staff members:', { count: staffList.length });

    // 5. Prepare config for generation with new start date
    const configForGeneration = {
      id: config.id,
      cycle_length_weeks: config.cycle_length_weeks,
      shift_type: config.shift_type as "8h" | "12h",
      operational_hours_per_day: config.operational_hours_per_day,
      handshake_minutes: config.handshake_minutes,
      start_date: newStartDate
    };

    // 6. Generate and save roster with auto-generated version name
    const versionName = `Auto-Continued v${nextVersionNumber} - ${config.config_name}`;
    const newVersionId = await generateAndSaveRoster(
      staffList,
      configForGeneration,
      versionName
    );

    logger.info('Successfully continued roster', { newVersionId });
    return newVersionId;

  } catch (error) {
    logger.error(new Error('Error continuing roster'), { originalError: error });
    throw error;
  }
}
