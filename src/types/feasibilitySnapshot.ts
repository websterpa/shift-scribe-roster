/**
 * Feasibility Snapshot Types
 * 
 * Used to track the exact feasibility configuration at roster generation time
 * and detect drift from current live config.
 */

import type { RequirementsV2 } from './requirementsV2';

export interface FeasibilitySnapshot {
  pattern_id: string;
  pattern_name: string;
  framework: '8h' | '12h';
  requirements_v2: RequirementsV2;
  buffer_pct: number;
  standard_contract_hours: number;
  auto_reduce_enabled: boolean;
  timestamp: string; // ISO string
}

/**
 * Drift detection result
 */
export interface ConfigDrift {
  hasDrift: boolean;
  changes: DriftChange[];
}

export interface DriftChange {
  field: string;
  label: string;
  snapshotValue: any;
  currentValue: any;
  category: 'pattern' | 'framework' | 'requirements' | 'settings';
}

/**
 * Detect drift between snapshot and current config
 */
export function detectConfigDrift(
  snapshot: FeasibilitySnapshot,
  currentConfig: {
    pattern_id?: string;
    pattern_name?: string;
    shift_type?: string;
    requirements_v2?: RequirementsV2;
    buffer_pct?: number;
    standard_contract_hours?: number;
  }
): ConfigDrift {
  const changes: DriftChange[] = [];

  // Pattern drift
  if (snapshot.pattern_id !== currentConfig.pattern_id) {
    changes.push({
      field: 'pattern_id',
      label: 'Pattern',
      snapshotValue: snapshot.pattern_name,
      currentValue: currentConfig.pattern_name || 'Unknown',
      category: 'pattern',
    });
  }

  // Framework drift
  if (snapshot.framework !== currentConfig.shift_type) {
    changes.push({
      field: 'framework',
      label: 'Framework',
      snapshotValue: snapshot.framework,
      currentValue: currentConfig.shift_type || 'Unknown',
      category: 'framework',
    });
  }

  // Requirements v2 drift (deep comparison)
  if (snapshot.requirements_v2 && currentConfig.requirements_v2) {
    const snapshotReqs = snapshot.requirements_v2;
    const currentReqs = currentConfig.requirements_v2;

    // Compare weekdays
    if (JSON.stringify(snapshotReqs.days.weekdays) !== JSON.stringify(currentReqs.days.weekdays)) {
      changes.push({
        field: 'requirements_weekdays',
        label: 'Weekday Requirements',
        snapshotValue: formatDayReq(snapshotReqs.days.weekdays),
        currentValue: formatDayReq(currentReqs.days.weekdays),
        category: 'requirements',
      });
    }

    // Compare saturday
    if (JSON.stringify(snapshotReqs.days.saturday) !== JSON.stringify(currentReqs.days.saturday)) {
      changes.push({
        field: 'requirements_saturday',
        label: 'Saturday Requirements',
        snapshotValue: formatDayReq(snapshotReqs.days.saturday),
        currentValue: formatDayReq(currentReqs.days.saturday),
        category: 'requirements',
      });
    }

    // Compare sunday
    if (JSON.stringify(snapshotReqs.days.sunday) !== JSON.stringify(currentReqs.days.sunday)) {
      changes.push({
        field: 'requirements_sunday',
        label: 'Sunday Requirements',
        snapshotValue: formatDayReq(snapshotReqs.days.sunday),
        currentValue: formatDayReq(currentReqs.days.sunday),
        category: 'requirements',
      });
    }
  }

  // Buffer drift
  if (snapshot.buffer_pct !== currentConfig.buffer_pct) {
    changes.push({
      field: 'buffer_pct',
      label: 'Buffer %',
      snapshotValue: `${snapshot.buffer_pct}%`,
      currentValue: `${currentConfig.buffer_pct}%`,
      category: 'settings',
    });
  }

  // Contract hours drift
  if (snapshot.standard_contract_hours !== currentConfig.standard_contract_hours) {
    changes.push({
      field: 'standard_contract_hours',
      label: 'Contract Hours',
      snapshotValue: `${snapshot.standard_contract_hours}h`,
      currentValue: `${currentConfig.standard_contract_hours}h`,
      category: 'settings',
    });
  }

  return {
    hasDrift: changes.length > 0,
    changes,
  };
}

/**
 * Format day requirements for display
 */
function formatDayReq(dayReq: any): string {
  return Object.entries(dayReq)
    .filter(([_, val]) => typeof val === 'number' && val > 0)
    .map(([key, val]) => `${key}:${val}`)
    .join(', ');
}
