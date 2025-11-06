/**
 * Feasibility Snapshot Drift Detection
 * 
 * Compares feasibility snapshots with live config to detect changes.
 */

import type { RequirementsV2 } from '@/types/requirementsV2';

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
  snapshot: string;
  current: string;
}

/**
 * Detect configuration drift between snapshot and live config
 * Returns array of differences, empty if no drift
 */
export function detectConfigDrift(
  snapshot: FeasibilitySnapshot | null,
  liveConfig: LiveConfig
): ConfigDiff[] | null {
  if (!snapshot) {
    return null;
  }

  const diffs: ConfigDiff[] = [];

  // Pattern drift
  if (snapshot.pattern_id !== liveConfig.pattern_id) {
    diffs.push({
      field: 'pattern',
      label: 'Pattern',
      snapshot: snapshot.pattern_name,
      current: liveConfig.pattern_name,
    });
  }

  // Framework drift
  if (snapshot.framework !== liveConfig.framework) {
    diffs.push({
      field: 'framework',
      label: 'Framework',
      snapshot: snapshot.framework,
      current: liveConfig.framework,
    });
  }

  // Requirements v2 drift
  if (snapshot.requirements_v2 && liveConfig.requirements_v2) {
    const snapshotReqs = snapshot.requirements_v2;
    const currentReqs = liveConfig.requirements_v2;

    // Compare weekdays
    if (JSON.stringify(snapshotReqs.days.weekdays) !== JSON.stringify(currentReqs.days.weekdays)) {
      diffs.push({
        field: 'requirements_weekdays',
        label: 'Weekday Requirements',
        snapshot: formatDayReq(snapshotReqs.days.weekdays),
        current: formatDayReq(currentReqs.days.weekdays),
      });
    }

    // Compare saturday
    if (JSON.stringify(snapshotReqs.days.saturday) !== JSON.stringify(currentReqs.days.saturday)) {
      diffs.push({
        field: 'requirements_saturday',
        label: 'Saturday Requirements',
        snapshot: formatDayReq(snapshotReqs.days.saturday),
        current: formatDayReq(currentReqs.days.saturday),
      });
    }

    // Compare sunday
    if (JSON.stringify(snapshotReqs.days.sunday) !== JSON.stringify(currentReqs.days.sunday)) {
      diffs.push({
        field: 'requirements_sunday',
        label: 'Sunday Requirements',
        snapshot: formatDayReq(snapshotReqs.days.sunday),
        current: formatDayReq(currentReqs.days.sunday),
      });
    }
  }

  // Buffer drift
  if (snapshot.buffer_pct !== liveConfig.buffer_pct) {
    diffs.push({
      field: 'buffer_pct',
      label: 'Buffer %',
      snapshot: `${snapshot.buffer_pct}%`,
      current: `${liveConfig.buffer_pct}%`,
    });
  }

  // Contract hours drift
  if (snapshot.standard_contract_hours !== liveConfig.standard_contract_hours) {
    diffs.push({
      field: 'standard_contract_hours',
      label: 'Contract Hours',
      snapshot: `${snapshot.standard_contract_hours}h`,
      current: `${liveConfig.standard_contract_hours}h`,
    });
  }

  // Auto-reduce drift
  if (snapshot.auto_reduce_enabled !== liveConfig.auto_reduce_enabled) {
    diffs.push({
      field: 'auto_reduce',
      label: 'Auto-reduce',
      snapshot: snapshot.auto_reduce_enabled ? 'ON' : 'OFF',
      current: liveConfig.auto_reduce_enabled ? 'ON' : 'OFF',
    });
  }

  return diffs;
}

/**
 * Format day requirements object for display
 */
function formatDayReq(dayReq: any): string {
  return Object.entries(dayReq as Record<string, number>)
    .filter(([_, val]) => val > 0)
    .map(([key, val]) => `${key}:${val}`)
    .join(', ') || 'None';
}
