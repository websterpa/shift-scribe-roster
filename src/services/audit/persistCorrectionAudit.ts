/**
 * Correction Audit Persistence Service
 * 
 * Handles batch insertion of correction changelogs to Supabase
 * for permanent audit tracking and compliance reporting.
 */

import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/utils/errorLogger';
import type { CorrectionChangeLog } from '@/engine/corrective/autoApply';

const logger = createLogger('PersistCorrectionAudit');

export interface AuditInsertRow {
  version_id: string;
  staff_id: string;
  shift_date: string;
  old_shift: string;
  new_shift: string;
  reason: string;
  severity: 'critical' | 'warning' | 'info';
  tenant_id?: string;
}

/**
 * Persist correction changelog entries to correction_audit table
 * 
 * @param versionId - Roster version ID
 * @param changelog - Array of correction changes
 * @param tenantId - Optional tenant ID for isolation
 * @returns Number of successfully inserted rows
 */
export async function persistCorrectionAudit(
  versionId: string,
  changelog: CorrectionChangeLog[],
  tenantId?: string
): Promise<number> {
  if (changelog.length === 0) {
    logger.info('[persistCorrectionAudit] No changelog entries to persist');
    return 0;
  }

  logger.info('[persistCorrectionAudit] Starting batch insert', {
    versionId,
    entries: changelog.length,
    tenantId
  });

  // Convert changelog to database format
  const rows: AuditInsertRow[] = changelog.map(entry => ({
    version_id: versionId,
    staff_id: entry.staffId,
    shift_date: entry.date,
    old_shift: entry.oldShift,
    new_shift: entry.newShift,
    reason: entry.reason,
    severity: entry.severity,
    ...(tenantId && { tenant_id: tenantId })
  }));

  // Batch insert in chunks of 100 to avoid payload limits
  const CHUNK_SIZE = 100;
  let totalInserted = 0;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    
    const { data, error } = await supabase
      .from('correction_audit')
      .insert(chunk)
      .select('id');

    if (error) {
      logger.error('[persistCorrectionAudit] Failed to insert chunk', {
        chunkIndex: Math.floor(i / CHUNK_SIZE),
        chunkSize: chunk.length,
        error: error.message
      });
      // Continue with next chunk even if this one fails
      continue;
    }

    totalInserted += data?.length || 0;
    logger.info('[persistCorrectionAudit] Chunk inserted successfully', {
      chunkIndex: Math.floor(i / CHUNK_SIZE),
      rowsInserted: data?.length || 0
    });
  }

  logger.info('[persistCorrectionAudit] Batch insert complete', {
    totalInserted,
    totalAttempted: rows.length
  });

  return totalInserted;
}

/**
 * Fetch correction audit entries for a roster version
 * 
 * @param versionId - Roster version ID
 * @returns Array of audit entries
 */
export async function fetchCorrectionAudit(versionId: string) {
  const { data, error } = await supabase
    .from('correction_audit')
    .select(`
      id,
      staff_id,
      shift_date,
      old_shift,
      new_shift,
      reason,
      severity,
      applied_at,
      staff_profiles (
        first_name,
        last_name,
        employee_id
      )
    `)
    .eq('version_id', versionId)
    .order('applied_at', { ascending: false });

  if (error) {
    logger.error('[fetchCorrectionAudit] Query failed', { error: error.message });
    return [];
  }

  return data || [];
}
