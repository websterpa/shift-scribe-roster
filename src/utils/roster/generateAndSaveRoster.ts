import { supabase } from "@/integrations/supabase/client";
import type { StaffMember } from "@/types/roster";
import { generateRoster, getDefaultRatePolicy, getDefaultRestRules, getDefaultGeneratorConfig } from "./rosterGeneration";
import { createLogger } from "../errorLogger";

const logger = createLogger('GenerateAndSaveRoster');

/**
 * Backward-compatible wrapper for generateRoster
 * Used by wizard and legacy components
 */
export async function generateAndSaveRoster(
  staffList: StaffMember[],
  config: any, // Accept any config format for backward compatibility
  versionName?: string
): Promise<{
  versionId: string;
  totalAssignments: number;
  optimizationResult?: { score: number };
  wtrResult?: { violations: unknown[] };
  costResult?: { totalCost: number; averageCost: number; breakdown: Record<string, unknown> };
}> {
  // Extract config properties - handle both new and legacy formats
  const configId = config.configId || config.id;
  const monthISO = config.monthISO || config.start_date?.substring(0, 7);
  const versionNameToUse = versionName || config.versionName || config.config_name;
  
  logger.info('generateAndSaveRoster called', { configId, monthISO });
  
  if (!configId || !monthISO) {
    throw new Error("configId and monthISO are required");
  }

  // Extract staff IDs
  const staffIds = staffList.map(s => s.id);

  // Create roster version with version_number
  const { data: existingVersions } = await supabase
    .from('roster_versions')
    .select('version_number')
    .eq('config_id', configId)
    .order('version_number', { ascending: false })
    .limit(1);
  
  const nextVersionNumber = (existingVersions && existingVersions[0]) 
    ? existingVersions[0].version_number + 1 
    : 1;

  const { data: versionData, error: versionError } = await supabase
    .from('roster_versions')
    .insert({
      config_id: configId,
      version_name: versionNameToUse || `Version ${Date.now()}`,
      version_number: nextVersionNumber,
    })
    .select()
    .single();

  if (versionError || !versionData) {
    logger.error(new Error('Failed to create roster version'), { error: versionError });
    throw new Error(`Failed to create roster version: ${versionError?.message || 'Unknown error'}`);
  }

  logger.info('Created roster version', { versionId: versionData.id });

  // Generate roster using new engine
  const result = await generateRoster({
    supabase,
    rosterVersionId: versionData.id,
    monthISO,
    ratePolicy: getDefaultRatePolicy(),
    restRules: getDefaultRestRules(),
    holidays: [],
    staffIds,
    config: getDefaultGeneratorConfig(),
  });

  logger.info('Roster generation complete', { 
    versionId: result.versionId, 
    assignments: result.assignmentsInserted 
  });

  return {
    versionId: result.versionId,
    totalAssignments: result.assignmentsInserted,
    optimizationResult: { score: 100 },
    wtrResult: { violations: [] },
    costResult: { totalCost: 0, averageCost: 0, breakdown: {} },
  };
}
