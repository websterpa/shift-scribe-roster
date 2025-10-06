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
  config: {
    configId?: string;
    monthISO?: string;
    versionName?: string;
    staffIds?: string[];
    siteId?: string;
  },
  versionName?: string
): Promise<{
  versionId: string;
  totalAssignments: number;
  optimizationResult?: { score: number };
  wtrResult?: { violations: unknown[] };
  costResult?: { totalCost: number; averageCost: number; breakdown: Record<string, unknown> };
}> {
  logger.info('generateAndSaveRoster called', { configId: config.configId, monthISO: config.monthISO });
  
  if (!config.configId || !config.monthISO) {
    throw new Error("configId and monthISO are required");
  }

  // Extract staff IDs
  const staffIds = staffList.map(s => s.id);

  // Create roster version
  const { data: versionData, error: versionError } = await supabase
    .from('roster_versions')
    .insert({
      config_id: config.configId,
      version_name: versionName || config.versionName || `Version ${Date.now()}`,
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
    monthISO: config.monthISO,
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
