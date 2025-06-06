
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
    // 1. Fetch the roster_config record
    const { data: configRow, error: configError } = await supabase
      .from("roster_config")
      .select("id, config_name, start_date, cycle_length_weeks, shift_type, operational_hours_per_day, handshake_minutes")
      .eq("id", configId)
      .single();

    if (configError) {
      logger.error(new Error('Failed to fetch config'), { error: configError });
      throw configError;
    }

    if (!configRow) {
      throw new Error('Configuration not found');
    }

    logger.info('Fetched config:', configRow);

    // 2. Fetch the last version_number for this config
    const { data: lastVer, error: versionError } = await supabase
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

    if (!lastVer) {
      throw new Error('No previous roster version found for this configuration');
    }

    const nextVersionNumber = lastVer.version_number + 1;
    logger.info('Next version number:', nextVersionNumber);

    // 3. Compute newStartDate = oldStart + cycle_length_weeks * 7 * (nextVersionNumber - 1)
    const oldStart = new Date(configRow.start_date);
    const newStart = new Date(oldStart);
    newStart.setDate(
      oldStart.getDate() + configRow.cycle_length_weeks * 7 * (nextVersionNumber - 1)
    );
    const newStartDateStr = newStart.toISOString().split("T")[0];
    
    logger.info('Calculated new start date:', newStartDateStr);

    // 4. Fetch staff members
    const staffList = await fetchStaffMembers();
    logger.info('Fetched staff members:', { count: staffList.length });

    // 5. Prepare config for generation with new start date
    const configForGeneration = {
      id: configRow.id,
      cycle_length_weeks: configRow.cycle_length_weeks,
      shift_type: configRow.shift_type as "8h" | "12h",
      operational_hours_per_day: configRow.operational_hours_per_day,
      handshake_minutes: configRow.handshake_minutes,
      start_date: newStartDateStr
    };

    // 6. Generate and save roster with auto-generated version name
    const versionName = `Auto-Continued v${nextVersionNumber} - ${configRow.config_name}`;
    const newVersionId = await generateAndSaveRoster(
      staffList,
      configForGeneration,
      versionName
    );

    logger.info('Successfully continued roster', { newVersionId });
    return newVersionId;

  } catch (error: any) {
    logger.error(new Error('Error continuing roster'), { originalError: error });
    throw new Error(`Failed to continue roster: ${error.message}`);
  }
}
