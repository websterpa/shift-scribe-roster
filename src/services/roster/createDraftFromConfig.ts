import { supabase } from "@/integrations/supabase/client";
import type { RosterConfigRow } from "@/services/feasibility/applySetup";

export interface CreateDraftInput {
  tenantId: string;
  month: string; // YYYY-MM format
  configSnapshot: RosterConfigRow;
}

/**
 * Result of creating a draft roster.
 * Guarantees a stable versionId field for navigation.
 */
export interface CreateDraftResult {
  versionId: string;
  configId: string;
  month: string;
}

export async function createDraftFromConfig(
  input: CreateDraftInput
): Promise<CreateDraftResult> {
  console.log('📋 Creating draft roster from config...', input);

  const { configSnapshot, tenantId, month } = input;

  // Create a roster version
  const versionLabel = `Draft ${month} (from Feasibility)`;
  
  const { data: version, error: versionError } = await supabase
    .from('roster_versions')
    .insert({
      config_id: configSnapshot.id,
      tenant_id: tenantId,
      version_number: 1,
      version_name: versionLabel,
      label: versionLabel,
      generated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (versionError || !version) {
    console.error('❌ Error creating roster version:', versionError);
    throw new Error(`Failed to create draft: ${versionError?.message}`);
  }

  // Guard: ensure we have a valid ID before returning
  if (!version.id) {
    console.error('❌ Version created but no ID returned:', version);
    throw new Error('Draft created but version ID is missing');
  }

  console.log('✅ Draft roster version created:', version);

  return {
    versionId: version.id,
    configId: configSnapshot.id,
    month
  };
}
