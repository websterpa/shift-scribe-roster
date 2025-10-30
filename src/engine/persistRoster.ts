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

  // Batch insert assignments
  const { error: assignmentError } = await supabase
    .from('roster_assignments')
    .insert(assignments);

  if (assignmentError) {
    console.error('[persistRoster] Failed to insert assignments:', assignmentError);
    throw new Error(`Failed to save roster assignments: ${assignmentError.message}`);
  }

  console.log(`[persistRoster] Successfully saved ${assignments.length} assignments`);

  return version as RosterVersion;
}
