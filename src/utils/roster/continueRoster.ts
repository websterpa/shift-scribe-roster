
import { supabase } from "@/integrations/supabase/client";
import { generateAndSaveRoster } from "@/services/roster/generation";
import { fetchStaffMembers } from "@/services/roster/helpers";
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
      .select("id, config_name, start_date, cycle_length_weeks, shift_type, operational_hours_per_day, handshake_minutes, pattern")
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

    // 2. Find the last assignment date from the most recent version
    const { data: lastVersionData, error: versionError } = await supabase
      .from("roster_versions")
      .select("id, version_number")
      .eq("config_id", configId)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    if (versionError) {
      logger.error(new Error('Failed to fetch last version'), { error: versionError });
      throw versionError;
    }

    if (!lastVersionData) {
      throw new Error('No previous roster version found for this configuration');
    }

    // 3. Find the last assignment date from the most recent version
    const { data: lastAssignment, error: assignmentError } = await supabase
      .from("roster_assignments")
      .select("date")
      .eq("version_id", lastVersionData.id)
      .order("date", { ascending: false })
      .limit(1)
      .single();

    if (assignmentError || !lastAssignment) {
      logger.warn('No assignments found, using config start date + cycle length');
      // Fallback to calculating from config start date
      const oldStart = new Date(configRow.start_date);
      const newStart = new Date(oldStart);
      newStart.setDate(oldStart.getDate() + configRow.cycle_length_weeks * 7 * lastVersionData.version_number);
      var newStartDateStr = newStart.toISOString().split("T")[0];
    } else {
      // Calculate new start date as the day after the last assignment
      const lastDate = new Date(lastAssignment.date);
      lastDate.setDate(lastDate.getDate() + 1);
      var newStartDateStr = lastDate.toISOString().split("T")[0];
    }
    
    logger.info('Calculated new start date:', newStartDateStr);

    const nextVersionNumber = lastVersionData.version_number + 1;
    logger.info('Next version number:', nextVersionNumber);

    // 4. Fetch staff members
    const staffList = await fetchStaffMembers();
    logger.info('Fetched staff members:', { count: staffList.length });

    // 5. Prepare config for generation with new start date and preserved pattern
    const configForGeneration = {
      id: configRow.id,
      cycle_length_weeks: configRow.cycle_length_weeks,
      shift_type: configRow.shift_type as "8h" | "12h",
      operational_hours_per_day: configRow.operational_hours_per_day,
      handshake_minutes: configRow.handshake_minutes,
      start_date: newStartDateStr,
      // FIXED: Properly convert Json[] to string[] with validation
      ...(configRow.pattern && Array.isArray(configRow.pattern) && configRow.pattern.length > 0 && { 
        pattern: configRow.pattern.filter((item): item is string => typeof item === 'string')
      })
    };

    // 6. Generate and save roster with auto-generated version name
    const versionName = `Continued v${nextVersionNumber} - ${configRow.config_name}`;
    const result = await generateAndSaveRoster(
      staffList,
      configForGeneration,
      versionName
    );

    logger.info('Successfully continued roster', { result });
    return result.versionId;

  } catch (error: any) {
    logger.error(new Error('Error continuing roster'), { originalError: error });
    throw new Error(`Failed to continue roster: ${error.message}`);
  }
}
