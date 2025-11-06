/**
 * Feasibility Snapshot Comparison
 * 
 * Detects drift between a feasibility snapshot and current live configuration.
 */

import type { RequirementsV2 } from "@/types/requirementsV2";

export interface FeasibilitySnapshot {
  pattern_id: string;
  pattern_name: string;
  framework: '8h' | '12h';
  requirements_v2: RequirementsV2;
  buffer_pct: number;
  standard_contract_hours: number;
  auto_reduce_enabled: boolean;
  timestamp: string;
}

export interface LiveConfig {
  pattern_id: string;
  pattern_name: string;
  framework: '8h' | '12h';
  requirements_v2: RequirementsV2 | null;
  buffer_pct: number;
  standard_contract_hours: number;
  auto_reduce_enabled: boolean;
}

export interface ConfigDiff {
  field: string;
  label: string;
  snapshot: string | number;
  current: string | number;
}

/**
 * Compare a feasibility snapshot with current live config.
 * Returns null if no snapshot, or a list of differences.
 */
export function detectConfigDrift(
  snapshot: FeasibilitySnapshot | null,
  live: LiveConfig
): ConfigDiff[] | null {
  if (!snapshot) return null;

  const diffs: ConfigDiff[] = [];

  // Pattern mismatch
  if (snapshot.pattern_id !== live.pattern_id) {
    diffs.push({
      field: 'pattern',
      label: 'Pattern',
      snapshot: snapshot.pattern_name,
      current: live.pattern_name,
    });
  }

  // Framework mismatch
  if (snapshot.framework !== live.framework) {
    diffs.push({
      field: 'framework',
      label: 'Framework',
      snapshot: snapshot.framework,
      current: live.framework,
    });
  }

  // Requirements v2 comparison (day-type level)
  if (live.requirements_v2) {
    const snapshotReqs = snapshot.requirements_v2;
    const liveReqs = live.requirements_v2;

    if (snapshotReqs.framework === liveReqs.framework) {
      // Compare each day type
      for (const dayType of ['weekdays', 'saturday', 'sunday'] as const) {
        const snapDay = (snapshotReqs.days as any)[dayType];
        const liveDay = (liveReqs.days as any)[dayType];

        // Get shift keys based on framework
        const shiftKeys = snapshotReqs.framework === '8h' ? ['E', 'L', 'N'] : ['D', 'N'];

        for (const shift of shiftKeys) {
          const snapVal = snapDay[shift] ?? 0;
          const liveVal = liveDay[shift] ?? 0;

          if (snapVal !== liveVal) {
            diffs.push({
              field: `${dayType}_${shift}`,
              label: `${capitalize(dayType)} ${shift}`,
              snapshot: snapVal,
              current: liveVal,
            });
          }
        }
      }
    }
  }

  // Buffer percentage
  if (snapshot.buffer_pct !== live.buffer_pct) {
    diffs.push({
      field: 'buffer_pct',
      label: 'Buffer %',
      snapshot: snapshot.buffer_pct,
      current: live.buffer_pct,
    });
  }

  // Contract hours
  if (snapshot.standard_contract_hours !== live.standard_contract_hours) {
    diffs.push({
      field: 'contract_hours',
      label: 'Contract Hours',
      snapshot: snapshot.standard_contract_hours,
      current: live.standard_contract_hours,
    });
  }

  // Auto-reduce setting
  if (snapshot.auto_reduce_enabled !== live.auto_reduce_enabled) {
    diffs.push({
      field: 'auto_reduce',
      label: 'Auto-reduce',
      snapshot: snapshot.auto_reduce_enabled ? 'ON' : 'OFF',
      current: live.auto_reduce_enabled ? 'ON' : 'OFF',
    });
  }

  return diffs;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Create a snapshot from current feasibility state
 */
export function createFeasibilitySnapshot(
  patternId: string,
  patternName: string,
  framework: '8h' | '12h',
  requirementsV2: RequirementsV2,
  bufferPct: number,
  standardContractHours: number,
  autoReduceEnabled: boolean
): FeasibilitySnapshot {
  return {
    pattern_id: patternId,
    pattern_name: patternName,
    framework,
    requirements_v2: requirementsV2,
    buffer_pct: bufferPct,
    standard_contract_hours: standardContractHours,
    auto_reduce_enabled: autoReduceEnabled,
    timestamp: new Date().toISOString(),
  };
}
