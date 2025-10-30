/**
 * Roster persistence layer for Atlas
 * Handles saving rosters to Supabase with tenant isolation
 */

import { supabase } from '@/integrations/supabase/client';
import type { RosterAssignment } from './generateRoster';

export interface SaveRosterInput {
  tenantId: string;
  roster: RosterAssignment[];
  configId: string;
  label?: string;
}

export interface RosterVersion {
  id: string;
  tenant_id: string;
  config_id: string;
  version_number: number;
  label: string;
  generated_at: string;
}

/**
 * Save a generated roster to the database with version tracking
 * 
 * @param input - Roster data and metadata
 * @returns The created roster version record
 */
export async function saveRoster(input: SaveRosterInput): Promise<RosterVersion> {
  const { tenantId, roster, configId, label = 'Auto-Generated' } = input;

  console.log(`[persistRoster] Saving roster for tenant ${tenantId}`, {
    assignmentCount: roster.length,
    configId,
    label
  });

  // Get next version number for this config
  const { data: existingVersions } = await supabase
    .from('roster_versions')
    .select('version_number')
    .eq('config_id', configId)
    .eq('tenant_id', tenantId)
    .order('version_number', { ascending: false })
    .limit(1);

  const nextVersion = existingVersions && existingVersions.length > 0 
    ? existingVersions[0].version_number + 1 
    : 1;

  // Create version record
  const { data: version, error: versionError } = await supabase
    .from('roster_versions')
    .insert({
      tenant_id: tenantId,
      config_id: configId,
      version_number: nextVersion,
      label
    })
    .select()
    .single();

  if (versionError || !version) {
    console.error('[persistRoster] Failed to create version:', versionError);
    throw new Error(`Failed to create roster version: ${versionError?.message}`);
  }

  console.log(`[persistRoster] Created version ${nextVersion} with ID ${version.id}`);

  // Prepare assignment records with tenant_id and version_id
  const assignments = roster.map(assignment => ({
    version_id: version.id,
    tenant_id: tenantId,
    staff_id: assignment.staffId,
    date: assignment.date.toISOString().split('T')[0], // Convert Date to string YYYY-MM-DD
    shift_code: assignment.shift,
    shift_start: assignment.shiftStart?.toISOString(),
    shift_end: assignment.shiftEnd?.toISOString(),
    hours: assignment.hours,
    cost: assignment.cost
  }));

  // OPTIMIZATION: Batch insert assignments in chunks of 500 to handle large rosters
  // This prevents timeout errors and reduces memory pressure
  const batchSize = 500;
  const totalBatches = Math.ceil(assignments.length / batchSize);
  
  console.log(`[persistRoster] Inserting ${assignments.length} assignments in ${totalBatches} batches`);
  
  for (let i = 0; i < assignments.length; i += batchSize) {
    const chunk = assignments.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    
    const { error: batchError } = await supabase
      .from('roster_assignments')
      .insert(chunk);

    if (batchError) {
      console.error(`[persistRoster] Failed to insert batch ${batchNum}/${totalBatches}:`, batchError);
      throw new Error(`Failed to save roster assignments (batch ${batchNum}): ${batchError.message}`);
    }
    
    console.log(`[persistRoster] Saved batch ${batchNum}/${totalBatches} (${chunk.length} assignments)`);
  }

  console.log(`[persistRoster] Successfully saved ${assignments.length} assignments in ${totalBatches} batches`);

  return version as RosterVersion;
}
