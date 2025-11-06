/**
 * Unified Requirements Schema V2
 * 
 * Eliminates Feasibility→Builder discrepancies by providing a single
 * canonical format with day-type grouping (weekdays/saturday/sunday).
 */

import { z } from 'zod';

export type Framework = '8h' | '12h';

// 8-hour framework: Early, Late, Night
export interface DayReq8h {
  E: number;
  L: number;
  N: number;
}

// 12-hour framework: Day, Night
export interface DayReq12h {
  D: number;
  N: number;
}

// Day-type groupings
export interface DayTypeGroup8h {
  weekdays: DayReq8h;
  saturday: DayReq8h;
  sunday: DayReq8h;
}

export interface DayTypeGroup12h {
  weekdays: DayReq12h;
  saturday: DayReq12h;
  sunday: DayReq12h;
}

// Unified requirements schema (discriminated union by framework)
export type RequirementsV2 =
  | { framework: '8h'; days: DayTypeGroup8h }
  | { framework: '12h'; days: DayTypeGroup12h };

// Zod validators for runtime validation
const dayReq8hSchema = z.object({
  E: z.number().min(0).max(10),
  L: z.number().min(0).max(10),
  N: z.number().min(0).max(10),
});

const dayReq12hSchema = z.object({
  D: z.number().min(0).max(10),
  N: z.number().min(0).max(10),
});

const dayTypeGroup8hSchema = z.object({
  weekdays: dayReq8hSchema,
  saturday: dayReq8hSchema,
  sunday: dayReq8hSchema,
});

const dayTypeGroup12hSchema = z.object({
  weekdays: dayReq12hSchema,
  saturday: dayReq12hSchema,
  sunday: dayReq12hSchema,
});

export const requirementsV2Schema = z.discriminatedUnion('framework', [
  z.object({
    framework: z.literal('8h'),
    days: dayTypeGroup8hSchema,
  }),
  z.object({
    framework: z.literal('12h'),
    days: dayTypeGroup12hSchema,
  }),
]) as z.ZodType<RequirementsV2>;

/**
 * Validate requirements v2 structure
 */
export function validateRequirementsV2(data: unknown): RequirementsV2 {
  return requirementsV2Schema.parse(data);
}

/**
 * Check if requirements match framework
 */
export function validateFrameworkConsistency(reqs: RequirementsV2): string | null {
  const { framework, days } = reqs;
  
  if (framework === '8h') {
    const day8h = days as DayTypeGroup8h;
    // Check all day types have only E/L/N keys
    for (const dayType of ['weekdays', 'saturday', 'sunday'] as const) {
      const keys = Object.keys(day8h[dayType]);
      if (keys.some(k => !['E', 'L', 'N'].includes(k))) {
        return `8h framework must only use E/L/N shifts, found: ${keys.join(',')}`;
      }
    }
  } else {
    const day12h = days as DayTypeGroup12h;
    // Check all day types have only D/N keys
    for (const dayType of ['weekdays', 'saturday', 'sunday'] as const) {
      const keys = Object.keys(day12h[dayType]);
      if (keys.some(k => !['D', 'N'].includes(k))) {
        return `12h framework must only use D/N shifts, found: ${keys.join(',')}`;
      }
    }
  }
  
  return null;
}

/**
 * Convert RequirementsV2 to per-day-of-week format for generator
 * Returns Record<0-6, Record<shift_code, count>>
 */
export function requirementsV2ToDayOfWeek(reqs: RequirementsV2): Record<number, Record<string, number>> {
  const result: Record<number, Record<string, number>> = {};
  const { days } = reqs;
  
  // Map day-of-week indices: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  for (let dow = 0; dow <= 6; dow++) {
    const dayType = dow === 0 ? 'sunday' : dow === 6 ? 'saturday' : 'weekdays';
    const dayReqs = (days as any)[dayType];
    
    result[dow] = {};
    for (const [shift, count] of Object.entries(dayReqs)) {
      if (typeof count === 'number' && count > 0) {
        result[dow][shift] = count;
      }
    }
  }
  
  return result;
}

/**
 * Create default requirements for a framework
 */
export function createDefaultRequirementsV2(framework: Framework): RequirementsV2 {
  if (framework === '8h') {
    return {
      framework: '8h',
      days: {
        weekdays: { E: 2, L: 2, N: 1 },
        saturday: { E: 1, L: 1, N: 1 },
        sunday: { E: 1, L: 1, N: 1 },
      },
    };
  } else {
    return {
      framework: '12h',
      days: {
        weekdays: { D: 2, N: 2 },
        saturday: { D: 1, N: 1 },
        sunday: { D: 1, N: 1 },
      },
    };
  }
}
