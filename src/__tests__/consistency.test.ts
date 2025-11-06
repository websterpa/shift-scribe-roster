/**
 * Unit tests for consistency checker
 */

import { describe, it, expect } from 'vitest';
import { checkConfig, type CheckInput } from '@/utils/consistency/checkConfig';
import type { RequirementsV2 } from '@/types/requirementsV2';

describe('checkConfig', () => {
  // T1: Clean 8h config
  it('should return no issues for a valid 8h configuration', () => {
    const req8h: RequirementsV2 = {
      framework: '8h',
      days: {
        weekdays: { E: 2, L: 2, N: 1 },
        saturday: { E: 1, L: 1, N: 1 },
        sunday: { E: 1, L: 1, N: 1 },
      },
    };

    const input: CheckInput = {
      tenantId: 'tenant-1',
      config: {
        tenant_id: 'tenant-1',
        shift_length_hours: 8,
        buffer_pct: 10,
        standard_contract_hours: 37.5,
        auto_reduce_enabled: false,
        pattern_id: 'pattern-1',
        requirements_v2: req8h,
      },
      builder: {
        requirements_v2: req8h,
        shift_length_hours: 8,
      },
      pattern: {
        id: 'pattern-1',
        sequence: ['E', 'E', 'L', 'L', 'N', 'N', 'R', 'R', 'R', 'R'],
      },
      snapshot: null,
    };

    const issues = checkConfig(input);
    expect(issues).toHaveLength(0);
  });

  // T2: Framework-hours mismatch
  it('should detect framework-hours mismatch', () => {
    const req8h: RequirementsV2 = {
      framework: '8h',
      days: {
        weekdays: { E: 2, L: 2, N: 1 },
        saturday: { E: 1, L: 1, N: 1 },
        sunday: { E: 1, L: 1, N: 1 },
      },
    };

    const input: CheckInput = {
      config: {
        shift_length_hours: 12, // Wrong!
        requirements_v2: req8h,
      },
      builder: {
        requirements_v2: req8h,
      },
    };

    const issues = checkConfig(input);
    const frameworkIssue = issues.find(i => i.code === 'framework-hours-mismatch');
    expect(frameworkIssue).toBeDefined();
    expect(frameworkIssue?.severity).toBe('error');
    expect(frameworkIssue?.message).toContain('doesn\'t match framework');
  });

  // T3: Invalid keys for framework
  it('should detect invalid shift keys for 12h framework', () => {
    // Intentionally malformed
    const req12hWithInvalidKeys: any = {
      framework: '12h',
      days: {
        weekdays: { D: 2, N: 2, E: 1 }, // E is invalid for 12h
        saturday: { D: 1, N: 1 },
        sunday: { D: 1, N: 1 },
      },
    };

    const input: CheckInput = {
      config: {
        shift_length_hours: 12,
        requirements_v2: req12hWithInvalidKeys,
      },
      builder: {
        requirements_v2: req12hWithInvalidKeys,
      },
    };

    const issues = checkConfig(input);
    const invalidKeyIssue = issues.find(i => i.code === 'framework-invalid-keys');
    expect(invalidKeyIssue).toBeDefined();
    expect(invalidKeyIssue?.severity).toBe('error');
    expect(invalidKeyIssue?.details).toContain('E');
  });

  // T4: Day-groups parity failure
  it('should detect when builder differs from config', () => {
    const configReq: RequirementsV2 = {
      framework: '8h',
      days: {
        weekdays: { E: 2, L: 2, N: 1 },
        saturday: { E: 1, L: 1, N: 1 },
        sunday: { E: 1, L: 1, N: 1 },
      },
    };

    const builderReq: RequirementsV2 = {
      framework: '8h',
      days: {
        weekdays: { E: 2, L: 2, N: 1 },
        saturday: { E: 1, L: 1, N: 1 },
        sunday: { E: 1, L: 1, N: 2 }, // Different!
      },
    };

    const input: CheckInput = {
      config: {
        requirements_v2: configReq,
      },
      builder: {
        requirements_v2: builderReq,
      },
    };

    const issues = checkConfig(input);
    const parityIssue = issues.find(i => i.code === 'day-groups-differ');
    expect(parityIssue).toBeDefined();
    expect(parityIssue?.severity).toBe('error');
    expect(parityIssue?.details).toContain('sunday');
  });

  // T5: Pattern incompatibility
  it('should warn about pattern-framework incompatibility', () => {
    const req12h: RequirementsV2 = {
      framework: '12h',
      days: {
        weekdays: { D: 2, N: 2 },
        saturday: { D: 1, N: 1 },
        sunday: { D: 1, N: 1 },
      },
    };

    const input: CheckInput = {
      config: {
        shift_length_hours: 12,
        requirements_v2: req12h,
      },
      builder: {
        requirements_v2: req12h,
      },
      pattern: {
        id: 'pattern-1',
        sequence: ['E', 'E', 'L', 'L', 'R', 'R', 'R', 'R'], // 8h pattern with 12h framework!
      },
    };

    const issues = checkConfig(input);
    const incompatIssue = issues.find(i => i.code === 'pattern-framework-incompatibility');
    expect(incompatIssue).toBeDefined();
    expect(incompatIssue?.severity).toBe('warn');
    expect(incompatIssue?.message).toContain('8h shifts');
  });

  // T6: Zero shift total
  it('should error on zero shift totals for required framework keys', () => {
    const req8hZeroL: RequirementsV2 = {
      framework: '8h',
      days: {
        weekdays: { E: 2, L: 0, N: 1 },
        saturday: { E: 1, L: 0, N: 1 },
        sunday: { E: 1, L: 0, N: 1 }, // All L = 0
      },
    };

    const input: CheckInput = {
      config: {
        shift_length_hours: 8,
        requirements_v2: req8hZeroL,
      },
      builder: {
        requirements_v2: req8hZeroL,
      },
    };

    const issues = checkConfig(input);
    const zeroIssue = issues.find(i => i.code === 'zero-shift');
    expect(zeroIssue).toBeDefined();
    expect(zeroIssue?.severity).toBe('error');
    expect(zeroIssue?.message).toContain('Zero total for shift L');
  });

  // T7: Snapshot drift
  it('should detect snapshot drift with correct severity', () => {
    const req8h: RequirementsV2 = {
      framework: '8h',
      days: {
        weekdays: { E: 2, L: 2, N: 1 },
        saturday: { E: 1, L: 1, N: 1 },
        sunday: { E: 1, L: 1, N: 1 },
      },
    };

    const input: CheckInput = {
      config: {
        shift_length_hours: 8,
        buffer_pct: 15,
        standard_contract_hours: 40,
        auto_reduce_enabled: true,
        requirements_v2: req8h,
      },
      builder: {
        requirements_v2: req8h,
      },
      snapshot: {
        buffer_pct: 10,
        standard_contract_hours: 37.5,
        auto_reduce_enabled: false,
        shift_length_hours: 8,
        requirements_v2: req8h,
      },
    };

    const issues = checkConfig(input);
    
    const bufferDrift = issues.find(i => i.code === 'buffer-drift');
    expect(bufferDrift).toBeDefined();
    expect(bufferDrift?.severity).toBe('warn');

    const contractDrift = issues.find(i => i.code === 'contract-drift');
    expect(contractDrift).toBeDefined();
    expect(contractDrift?.severity).toBe('warn');

    const autoReduceDrift = issues.find(i => i.code === 'auto-reduce-drift');
    expect(autoReduceDrift).toBeDefined();
    expect(autoReduceDrift?.severity).toBe('info');
  });

  // T8: Requirements missing
  it('should error when requirements_v2 is null', () => {
    const input: CheckInput = {
      config: {
        shift_length_hours: 8,
        requirements_v2: null, // Missing!
      },
      builder: {
        requirements_v2: null,
      },
    };

    const issues = checkConfig(input);
    const missingIssue = issues.find(i => i.code === 'requirements-missing');
    expect(missingIssue).toBeDefined();
    expect(missingIssue?.severity).toBe('error');
  });
});
