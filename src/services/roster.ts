import { supabase } from "@/integrations/supabase/client";
import { createLogger } from "@/utils/errorLogger";
import { getTenantId } from "@/features/tenant/useTenant";

const logger = createLogger('RosterService');

export function isUUID(v?: string | null): v is string {
  return !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export type CreateRosterVersionInput = {
  config_id: string;           // must be uuid
  version_name?: string | null;
  // do NOT include id from client - DB will generate it
};

export async function createRosterVersion(input: CreateRosterVersionInput) {
  if (!isUUID(input.config_id)) {
    throw new Error("Invalid config_id (must be UUID).");
  }

  logger.info('Creating roster version', { config_id: input.config_id, version_name: input.version_name });

  // Get next version number for this config
  // TODO(tenant): Add tenant_id filter when roster_versions table has tenant_id column
  const { data: existingVersions, error: versionQueryError } = await supabase
    .from("roster_versions")
    .select("version_number")
    .eq("config_id", input.config_id)
    .order("version_number", { ascending: false })
    .limit(1);

  if (versionQueryError) {
    logger.error(new Error('Error querying existing versions'), { error: versionQueryError });
    throw new Error(`Failed to query existing versions: ${versionQueryError.message}`);
  }

  const nextVersionNumber = existingVersions && existingVersions.length > 0 
    ? existingVersions[0].version_number + 1 
    : 1;

  // IMPORTANT: do NOT pass "id" — let DB default (gen_random_uuid()) generate it
  // TODO(tenant): Include tenant_id in insert when roster_versions table has tenant_id column
  const { data, error } = await supabase
    .from("roster_versions")
    .insert({
      config_id: input.config_id,
      version_number: nextVersionNumber,
      version_name: input.version_name ?? `Version ${nextVersionNumber}`,
      // tenant_id: getTenantId(), // Uncomment when column exists
    })
    .select("id, config_id, version_number, version_name, generated_at")
    .single();

  if (error || !data) {
    logger.error(new Error('Failed to create roster version'), { error });
    throw new Error(error?.message || "Failed to create roster version.");
  }

  logger.info('Created roster version successfully', { id: data.id, version_number: data.version_number });
  return data; // contains generated id (uuid)
}

export async function createRosterConfig(configData: any): Promise<string> {
  logger.info('Creating roster config', { configData });

  // Remove any temp IDs from config data
  const cleanConfigData = { ...configData };
  delete cleanConfigData.id; // Let DB generate the UUID

  // TODO(tenant): Include tenant_id in insert when roster_config table has tenant_id column
  const { data, error } = await supabase
    .from("roster_config")
    .insert({
      ...cleanConfigData,
      // tenant_id: getTenantId(), // Uncomment when column exists
    })
    .select("id")
    .single();

  if (error || !data) {
    logger.error(new Error('Failed to create roster config'), { error });
    throw new Error(error?.message || "Failed to create roster config.");
  }

  logger.info('Created roster config successfully', { id: data.id });
  return data.id;
}