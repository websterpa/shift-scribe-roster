/**
 * Feasibility ↔ Builder Consistency Checker
 * 
 * Validates configuration consistency across tenant config, builder state,
 * pattern selection, and feasibility snapshots.
 */

import type { RequirementsV2, Framework } from '@/types/requirementsV2';

export type Severity = 'error' | 'warn' | 'info';

export interface ConsistencyIssue {
  code: string;
  severity: Severity;
  message: string;
  details?: string;
  path?: string;
}

export interface CheckInput {
  tenantId?: string | null;
  config: {
    tenant_id?: string | null;
    shift_length_hours?: number | null;
    buffer_pct?: number | null;
    standard_contract_hours?: number | null;
    auto_reduce_enabled?: boolean | null;
    pattern_id?: string | null;
    requirements_v2: RequirementsV2 | null;
  };
  builder: {
    requirements_v2: RequirementsV2 | null;
    shift_length_hours?: number | null;
  };
  pattern?: {
    id: string;
    sequence: string[];
  } | null;
  snapshot?: {
    requirements_v2?: RequirementsV2 | null;
    shift_length_hours?: number | null;
    buffer_pct?: number | null;
    standard_contract_hours?: number | null;
    auto_reduce_enabled?: boolean | null;
    pattern_id?: string | null;
  } | null;
}

/**
 * Calculate weekly totals for a requirements_v2 object
 */
function weeklyTotals(req: RequirementsV2): Record<string, number> {
  const totals: Record<string, number> = {};
  const { framework, days } = req;
  
  // Get keys based on framework
  const keys = framework === '8h' ? ['E', 'L', 'N'] : ['D', 'N'];
  
  // Sum across 5 weekdays + Saturday + Sunday
  for (const key of keys) {
    const weekdayTotal = ((days.weekdays as any)[key] || 0) * 5;
    const satTotal = (days.saturday as any)[key] || 0;
    const sunTotal = (days.sunday as any)[key] || 0;
    totals[key] = weekdayTotal + satTotal + sunTotal;
  }
  
  return totals;
}

/**
 * Deep compare two requirements_v2 objects
 */
function requirementsEqual(a: RequirementsV2 | null, b: RequirementsV2 | null): boolean {
  if (!a || !b) return a === b;
  if (a.framework !== b.framework) return false;
  
  const keys = a.framework === '8h' ? ['E', 'L', 'N'] : ['D', 'N'];
  const dayTypes: Array<'weekdays' | 'saturday' | 'sunday'> = ['weekdays', 'saturday', 'sunday'];
  
  for (const dayType of dayTypes) {
    for (const key of keys) {
      const aVal = (a.days[dayType] as any)[key] || 0;
      const bVal = (b.days[dayType] as any)[key] || 0;
      if (aVal !== bVal) return false;
    }
  }
  
  return true;
}

/**
 * Format requirements for display
 */
function formatRequirements(req: RequirementsV2 | null, dayType: 'weekdays' | 'saturday' | 'sunday'): string {
  if (!req) return 'null';
  const day = req.days[dayType];
  if (req.framework === '8h') {
    return `E:${(day as any).E} L:${(day as any).L} N:${(day as any).N}`;
  } else {
    return `D:${(day as any).D} N:${(day as any).N}`;
  }
}

/**
 * Check configuration consistency
 */
export function checkConfig(input: CheckInput): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const { tenantId, config, builder, pattern, snapshot } = input;

  // R1: Tenant mismatch
  if (tenantId && config.tenant_id && tenantId !== config.tenant_id) {
    issues.push({
      code: 'tenant-mismatch',
      severity: 'error',
      message: 'Tenant ID mismatch between context and config',
      details: `Context tenant: ${tenantId}, Config tenant: ${config.tenant_id}`,
    });
  }

  // R2: Requirements missing
  if (!config.requirements_v2) {
    issues.push({
      code: 'requirements-missing',
      severity: 'error',
      message: 'Configuration requirements_v2 is missing',
      details: 'Cannot validate without requirements data',
    });
    return issues; // Can't continue validation
  }

  // R3: Framework-hours mismatch
  const framework = config.requirements_v2.framework;
  const expectedHours = framework === '8h' ? 8 : 12;
  const configHours = config.shift_length_hours;
  const builderHours = builder.shift_length_hours;

  if (configHours && configHours !== expectedHours) {
    issues.push({
      code: 'framework-hours-mismatch',
      severity: 'error',
      message: `Shift length (${configHours}h) doesn't match framework (${framework})`,
      details: `Expected ${expectedHours}h for ${framework} framework`,
      path: 'config.shift_length_hours',
    });
  }

  if (builderHours && builderHours !== expectedHours) {
    issues.push({
      code: 'framework-hours-mismatch',
      severity: 'error',
      message: `Builder shift length (${builderHours}h) doesn't match framework (${framework})`,
      details: `Expected ${expectedHours}h for ${framework} framework`,
      path: 'builder.shift_length_hours',
    });
  }

  // R4: Invalid keys for framework
  const validKeys = framework === '8h' ? ['E', 'L', 'N'] : ['D', 'N'];
  const invalidKeys = framework === '8h' ? ['D'] : ['E', 'L'];
  
  const dayTypes: Array<'weekdays' | 'saturday' | 'sunday'> = ['weekdays', 'saturday', 'sunday'];
  for (const dayType of dayTypes) {
    const dayReq = config.requirements_v2.days[dayType];
    const keys = Object.keys(dayReq);
    const foundInvalid = keys.filter(k => invalidKeys.includes(k));
    
    if (foundInvalid.length > 0) {
      issues.push({
        code: 'framework-invalid-keys',
        severity: 'error',
        message: `Invalid shift keys for ${framework} framework in ${dayType}`,
        details: `Found: ${foundInvalid.join(', ')}. Expected only: ${validKeys.join(', ')}`,
        path: `config.requirements_v2.days.${dayType}`,
      });
    }
  }

  // R5: Zero shift totals
  const totals = weeklyTotals(config.requirements_v2);
  for (const key of validKeys) {
    if (totals[key] === 0) {
      issues.push({
        code: 'zero-shift',
        severity: 'error',
        message: `Zero total for shift ${key} across the week`,
        details: `Framework ${framework} requires at least 1 ${key} shift somewhere in the week`,
        path: `config.requirements_v2`,
      });
    }
  }

  // R6: Day-groups parity
  if (builder.requirements_v2) {
    if (!requirementsEqual(config.requirements_v2, builder.requirements_v2)) {
      // Find which day types differ
      const diffs: string[] = [];
      for (const dayType of dayTypes) {
        const configDay = config.requirements_v2.days[dayType];
        const builderDay = builder.requirements_v2.days[dayType];
        
        for (const key of validKeys) {
          const configVal = (configDay as any)[key] || 0;
          const builderVal = (builderDay as any)[key] || 0;
          if (configVal !== builderVal) {
            diffs.push(`${dayType}.${key}: config=${configVal} builder=${builderVal}`);
          }
        }
      }
      
      issues.push({
        code: 'day-groups-differ',
        severity: 'error',
        message: 'Builder requirements differ from config',
        details: diffs.join('; '),
        path: 'builder.requirements_v2',
      });
    }
  }

  // R7: Pattern-framework incompatibility
  if (pattern) {
    const patternTokens = pattern.sequence;
    const has8hTokens = patternTokens.some(t => ['E', 'L'].includes(t));
    const has12hTokens = patternTokens.some(t => t === 'D');
    
    if (framework === '8h' && has12hTokens) {
      issues.push({
        code: 'pattern-framework-incompatibility',
        severity: 'warn',
        message: 'Pattern contains 12h shift (D) but framework is 8h',
        details: 'Engine may remap tokens. Verify pattern alignment.',
        path: 'pattern.sequence',
      });
    }
    
    if (framework === '12h' && has8hTokens) {
      issues.push({
        code: 'pattern-framework-incompatibility',
        severity: 'warn',
        message: 'Pattern contains 8h shifts (E/L) but framework is 12h',
        details: 'Engine may remap tokens. Verify pattern alignment.',
        path: 'pattern.sequence',
      });
    }
  }

  // R8: Snapshot drift
  if (snapshot) {
    if (snapshot.buffer_pct !== undefined && config.buffer_pct !== snapshot.buffer_pct) {
      issues.push({
        code: 'buffer-drift',
        severity: 'warn',
        message: 'Buffer percentage changed since generation',
        details: `Snapshot: ${snapshot.buffer_pct}%, Current: ${config.buffer_pct}%`,
        path: 'config.buffer_pct',
      });
    }

    if (snapshot.standard_contract_hours !== undefined && config.standard_contract_hours !== snapshot.standard_contract_hours) {
      issues.push({
        code: 'contract-drift',
        severity: 'warn',
        message: 'Contract hours changed since generation',
        details: `Snapshot: ${snapshot.standard_contract_hours}h, Current: ${config.standard_contract_hours}h`,
        path: 'config.standard_contract_hours',
      });
    }

    if (snapshot.auto_reduce_enabled !== undefined && config.auto_reduce_enabled !== snapshot.auto_reduce_enabled) {
      issues.push({
        code: 'auto-reduce-drift',
        severity: 'info',
        message: 'Auto-reduce setting changed',
        details: `Snapshot: ${snapshot.auto_reduce_enabled ? 'ON' : 'OFF'}, Current: ${config.auto_reduce_enabled ? 'ON' : 'OFF'}`,
        path: 'config.auto_reduce_enabled',
      });
    }

    if (snapshot.shift_length_hours !== undefined && configHours !== snapshot.shift_length_hours) {
      issues.push({
        code: 'shift-length-drift',
        severity: 'warn',
        message: 'Shift length changed since generation',
        details: `Snapshot: ${snapshot.shift_length_hours}h, Current: ${configHours}h`,
        path: 'config.shift_length_hours',
      });
    }

    if (snapshot.pattern_id !== undefined && config.pattern_id !== snapshot.pattern_id) {
      issues.push({
        code: 'pattern-drift',
        severity: 'warn',
        message: 'Pattern changed since generation',
        details: `Snapshot: ${snapshot.pattern_id}, Current: ${config.pattern_id}`,
        path: 'config.pattern_id',
      });
    }

    if (snapshot.requirements_v2 && !requirementsEqual(config.requirements_v2, snapshot.requirements_v2)) {
      // Find which day types differ
      const diffs: string[] = [];
      const dayTypes: Array<'weekdays' | 'saturday' | 'sunday'> = ['weekdays', 'saturday', 'sunday'];
      
      for (const dayType of dayTypes) {
        const snapshotStr = formatRequirements(snapshot.requirements_v2, dayType);
        const currentStr = formatRequirements(config.requirements_v2, dayType);
        if (snapshotStr !== currentStr) {
          diffs.push(`${dayType}: ${snapshotStr} → ${currentStr}`);
        }
      }
      
      if (diffs.length > 0) {
        issues.push({
          code: 'requirements-drift',
          severity: 'warn',
          message: 'Requirements changed since generation',
          details: diffs.join('; '),
          path: 'config.requirements_v2',
        });
      }
    }
  }

  return issues;
}
