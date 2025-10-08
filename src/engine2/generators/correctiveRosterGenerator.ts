import type { ShiftCode } from "@/utils/constraints";
import { createLogger } from "@/utils/errorLogger";

const logger = createLogger('CorrectiveRosterGenerator');

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CorrectiveStaffMember {
  id: string;
  name: string;
  availability: Record<string, boolean>; // dateISO -> available
  isNightEligible?: boolean;
}

export interface CoverageRequirements {
  [dateISO: string]: {
    E?: number;
    L?: number;
    N?: number;
  };
}

export interface CorrectivePolicy {
  maxConsecDays: number;           // default 6
  minDaysOffAfterBlock: number;    // default 2
  maxConsecNights: number;          // default 3
  minGapHoursBetweenShifts: number; // default 11
  weeklyHoursCap: number;           // default 48 (soft)
  fairShareWeight: number;          // default 50
  nightFairnessWeight: number;      // default 50
  preferRestAfterNights: boolean;   // default true
}

export interface CorrectiveInput {
  days: string[];  // dateISO array
  staff: CorrectiveStaffMember[];
  requirements: CoverageRequirements;
  policy: CorrectivePolicy;
}

export interface Assignment {
  staffId: string;
  dateISO: string;
  shiftType: 'E' | 'L' | 'N';
}

export interface CorrectiveResult {
  assignments: Assignment[];
  roster: Record<string, Record<string, ShiftCode>>; // staffId -> dateISO -> ShiftCode
  coverage: Record<string, { E: number; L: number; N: number }>;
  fairness: {
    staffTotals: Record<string, { E: number; L: number; N: number; total: number }>;
    targets: { E: number; L: number; N: number };
    variance: { E: number; L: number; N: number };
  };
  violations: string[];
  utilizationReport: Record<string, number>; // staffId -> total assignments
}

// ============================================================================
// DEFAULT POLICY
// ============================================================================

export const DEFAULT_CORRECTIVE_POLICY: CorrectivePolicy = {
  maxConsecDays: 6,
  minDaysOffAfterBlock: 2,
  maxConsecNights: 3,
  minGapHoursBetweenShifts: 11,
  weeklyHoursCap: 48,
  fairShareWeight: 50,
  nightFairnessWeight: 50,
  preferRestAfterNights: true,
};

// ============================================================================
// HELPER: ILLEGAL TURNAROUNDS (11h gap enforcement)
// ============================================================================

const ILLEGAL_TRANSITIONS: Record<string, string[]> = {
  'N': ['E', 'L'], // Night -> Early/Late violates 11h (N ends 06:00, E starts 06:00)
  'L': ['E'],      // Late -> Early violates 11h (L ends 22:00, E starts 06:00 = 8h)
};

function isIllegalTurnaround(prevShift: ShiftCode | null, nextShift: 'E' | 'L' | 'N'): boolean {
  if (!prevShift || prevShift === 'R') return false;
  return ILLEGAL_TRANSITIONS[prevShift]?.includes(nextShift) || false;
}

// ============================================================================
// ELIGIBILITY CHECK
// ============================================================================

interface EligibilityContext {
  staffId: string;
  dateISO: string;
  shiftType: 'E' | 'L' | 'N';
  currentAssignments: Map<string, Map<string, ShiftCode>>; // staffId -> dateISO -> ShiftCode
  staff: CorrectiveStaffMember;
  policy: CorrectivePolicy;
  days: string[];
}

function isEligible(ctx: EligibilityContext): boolean {
  const { staffId, dateISO, shiftType, currentAssignments, staff, policy, days } = ctx;

  // 1. Availability
  if (!staff.availability[dateISO]) return false;

  // 2. Night eligibility
  if (shiftType === 'N' && !staff.isNightEligible) return false;

  const staffAssignments = currentAssignments.get(staffId) || new Map();

  // 3. Already assigned on this day
  if (staffAssignments.has(dateISO)) return false;

  // 4. Illegal turnaround (previous day)
  const dayIndex = days.indexOf(dateISO);
  if (dayIndex > 0) {
    const prevDate = days[dayIndex - 1];
    const prevShift = staffAssignments.get(prevDate);
    if (isIllegalTurnaround(prevShift || null, shiftType)) return false;
  }

  // 5. Consecutive days limit
  const consecDays = countConsecutiveDaysBackward(staffId, dayIndex, days, staffAssignments);
  if (consecDays >= policy.maxConsecDays) return false;

  // 6. Consecutive nights limit
  if (shiftType === 'N') {
    const consecNights = countConsecutiveNightsBackward(staffId, dayIndex, days, staffAssignments);
    if (consecNights >= policy.maxConsecNights) return false;
  }

  return true;
}

// ============================================================================
// CONSECUTIVE COUNTERS
// ============================================================================

function countConsecutiveDaysBackward(
  staffId: string,
  currentDayIndex: number,
  days: string[],
  staffAssignments: Map<string, ShiftCode>
): number {
  let count = 0;
  for (let i = currentDayIndex - 1; i >= 0; i--) {
    const shift = staffAssignments.get(days[i]);
    if (shift && shift !== 'R') count++;
    else break;
  }
  return count;
}

function countConsecutiveNightsBackward(
  staffId: string,
  currentDayIndex: number,
  days: string[],
  staffAssignments: Map<string, ShiftCode>
): number {
  let count = 0;
  for (let i = currentDayIndex - 1; i >= 0; i--) {
    const shift = staffAssignments.get(days[i]);
    if (shift === 'N') count++;
    else break;
  }
  return count;
}

// ============================================================================
// PRIORITY CALCULATION (for greedy assignment)
// ============================================================================

interface PriorityContext {
  staffId: string;
  shiftType: 'E' | 'L' | 'N';
  assigned: Record<string, { E: number; L: number; N: number }>;
  targets: { E: number; L: number; N: number };
  currentDayIndex: number;
  days: string[];
  staffAssignments: Map<string, ShiftCode>;
}

function calculatePriority(ctx: PriorityContext): number {
  const { staffId, shiftType, assigned, targets, currentDayIndex, days, staffAssignments } = ctx;

  const staffStats = assigned[staffId] || { E: 0, L: 0, N: 0 };
  const total = staffStats.E + staffStats.L + staffStats.N;

  // Lower score = higher priority
  let score = 0;

  // 1. Under-served for this shift type (most important)
  const ratio = targets[shiftType] > 0 ? staffStats[shiftType] / targets[shiftType] : 0;
  score += ratio * 1000;

  // 2. Lowest total assignments (fairness)
  score += total * 10;

  // 3. For nights: time since last night (encourage spread)
  if (shiftType === 'N') {
    let daysSinceLastNight = 999;
    for (let i = currentDayIndex - 1; i >= 0; i--) {
      if (staffAssignments.get(days[i]) === 'N') {
        daysSinceLastNight = currentDayIndex - i;
        break;
      }
    }
    score -= daysSinceLastNight; // Negative = prioritize those who haven't had N recently
  }

  return score;
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export function generateCorrectiveRoster(input: CorrectiveInput): CorrectiveResult {
  logger.info('Starting corrective roster generation', { 
    staffCount: input.staff.length, 
    dayCount: input.days.length 
  });

  const { days, staff, requirements, policy } = input;
  
  // Initialize tracking
  const currentAssignments = new Map<string, Map<string, ShiftCode>>();
  const assigned: Record<string, { E: number; L: number; N: number }> = {};
  
  staff.forEach(s => {
    currentAssignments.set(s.id, new Map());
    assigned[s.id] = { E: 0, L: 0, N: 0 };
  });

  // Calculate targets
  const targets = calculateTargets(requirements, staff.length);
  logger.info('Calculated fair-share targets', targets);

  // STEP 1: Allocate in priority order: N → E → L
  const shiftOrder: Array<'N' | 'E' | 'L'> = ['N', 'E', 'L'];
  
  for (const shiftType of shiftOrder) {
    logger.info(`Allocating ${shiftType} shifts`);
    
    for (const dateISO of days) {
      const needed = requirements[dateISO]?.[shiftType] || 0;
      let filled = 0;

      while (filled < needed) {
        // Find eligible candidates
        const candidates = staff.filter(s => 
          isEligible({
            staffId: s.id,
            dateISO,
            shiftType,
            currentAssignments,
            staff: s,
            policy,
            days,
          })
        );

        if (candidates.length === 0) {
          logger.warn(`No eligible staff for ${shiftType} on ${dateISO}`, { filled, needed });
          break;
        }

        // Sort by priority
        candidates.sort((a, b) => {
          const prioA = calculatePriority({
            staffId: a.id,
            shiftType,
            assigned,
            targets,
            currentDayIndex: days.indexOf(dateISO),
            days,
            staffAssignments: currentAssignments.get(a.id)!,
          });
          const prioB = calculatePriority({
            staffId: b.id,
            shiftType,
            assigned,
            targets,
            currentDayIndex: days.indexOf(dateISO),
            days,
            staffAssignments: currentAssignments.get(b.id)!,
          });
          return prioA - prioB;
        });

        // Assign to highest priority
        const chosen = candidates[0];
        currentAssignments.get(chosen.id)!.set(dateISO, shiftType);
        assigned[chosen.id][shiftType]++;
        filled++;

        // If night and preferRestAfterNights, tentatively reserve next day as R
        if (shiftType === 'N' && policy.preferRestAfterNights) {
          const dayIndex = days.indexOf(dateISO);
          if (dayIndex < days.length - 1) {
            const nextDate = days[dayIndex + 1];
            const staffMap = currentAssignments.get(chosen.id)!;
            if (!staffMap.has(nextDate)) {
              staffMap.set(nextDate, 'R');
            }
          }
        }
      }
    }
  }

  // STEP 2: Fill rest days explicitly for all unassigned days
  for (const s of staff) {
    const staffMap = currentAssignments.get(s.id)!;
    for (const d of days) {
      if (!staffMap.has(d)) {
        staffMap.set(d, 'R');
      }
    }
  }

  // STEP 3: Ensure all staff utilized (repair pass)
  ensureAllStaffUtilized(staff, days, currentAssignments, assigned, targets, policy, requirements);

  // STEP 4: Build result
  const result = buildResult(staff, days, currentAssignments, assigned, targets, requirements);

  logger.info('Corrective roster generation complete', {
    totalAssignments: result.assignments.length,
    violations: result.violations.length,
  });

  return result;
}

// ============================================================================
// CALCULATE TARGETS
// ============================================================================

function calculateTargets(requirements: CoverageRequirements, staffCount: number) {
  let totalE = 0, totalL = 0, totalN = 0;

  for (const req of Object.values(requirements)) {
    totalE += req.E || 0;
    totalL += req.L || 0;
    totalN += req.N || 0;
  }

  return {
    E: Math.round(totalE / staffCount),
    L: Math.round(totalL / staffCount),
    N: Math.round(totalN / staffCount),
  };
}

// ============================================================================
// ENSURE ALL STAFF UTILIZED
// ============================================================================

function ensureAllStaffUtilized(
  staff: CorrectiveStaffMember[],
  days: string[],
  currentAssignments: Map<string, Map<string, ShiftCode>>,
  assigned: Record<string, { E: number; L: number; N: number }>,
  targets: { E: number; L: number; N: number },
  policy: CorrectivePolicy,
  requirements: CoverageRequirements
) {
  const unused = staff.filter(s => {
    const stats = assigned[s.id];
    return stats.E + stats.L + stats.N === 0;
  });

  if (unused.length === 0) return;

  logger.info('Ensuring all staff utilized', { unusedCount: unused.length });

  for (const s of unused) {
    // Find a day where we can swap or insert
    for (const dateISO of days) {
      const shifts: Array<'E' | 'L' | 'N'> = ['E', 'L', 'N'];
      
      for (const shiftType of shifts) {
        if (isEligible({
          staffId: s.id,
          dateISO,
          shiftType,
          currentAssignments,
          staff: s,
          policy,
          days,
        })) {
          // Assign this shift
          currentAssignments.get(s.id)!.set(dateISO, shiftType);
          assigned[s.id][shiftType]++;
          logger.info(`Assigned ${s.id} to ${shiftType} on ${dateISO} for utilization`);
          break;
        }
      }
      
      if (assigned[s.id].E + assigned[s.id].L + assigned[s.id].N > 0) break;
    }
  }
}

// ============================================================================
// BUILD RESULT
// ============================================================================

function buildResult(
  staff: CorrectiveStaffMember[],
  days: string[],
  currentAssignments: Map<string, Map<string, ShiftCode>>,
  assigned: Record<string, { E: number; L: number; N: number }>,
  targets: { E: number; L: number; N: number },
  requirements: CoverageRequirements
): CorrectiveResult {
  const assignments: Assignment[] = [];
  const roster: Record<string, Record<string, ShiftCode>> = {};
  const coverage: Record<string, { E: number; L: number; N: number }> = {};
  const violations: string[] = [];
  const utilizationReport: Record<string, number> = {};

  // Build assignments and roster
  for (const s of staff) {
    const staffMap = currentAssignments.get(s.id)!;
    roster[s.id] = {};
    let totalAssignments = 0;

    for (const [dateISO, shiftCode] of staffMap.entries()) {
      roster[s.id][dateISO] = shiftCode;
      
      if (shiftCode === 'E' || shiftCode === 'L' || shiftCode === 'N') {
        assignments.push({ staffId: s.id, dateISO, shiftType: shiftCode });
        totalAssignments++;
      }
    }

    utilizationReport[s.id] = totalAssignments;
  }

  // Calculate coverage
  for (const dateISO of days) {
    coverage[dateISO] = { E: 0, L: 0, N: 0 };
    
    for (const s of staff) {
      const shift = roster[s.id][dateISO];
      if (shift === 'E' || shift === 'L' || shift === 'N') {
        coverage[dateISO][shift]++;
      }
    }

    // Check coverage violations
    const req = requirements[dateISO];
    if (req) {
      if (req.E && coverage[dateISO].E !== req.E) {
        violations.push(`Coverage mismatch on ${dateISO} for E: got ${coverage[dateISO].E}, needed ${req.E}`);
      }
      if (req.L && coverage[dateISO].L !== req.L) {
        violations.push(`Coverage mismatch on ${dateISO} for L: got ${coverage[dateISO].L}, needed ${req.L}`);
      }
      if (req.N && coverage[dateISO].N !== req.N) {
        violations.push(`Coverage mismatch on ${dateISO} for N: got ${coverage[dateISO].N}, needed ${req.N}`);
      }
    }
  }

  // Calculate variance
  const staffTotals: Record<string, { E: number; L: number; N: number; total: number }> = {};
  for (const s of staff) {
    const stats = assigned[s.id];
    staffTotals[s.id] = {
      ...stats,
      total: stats.E + stats.L + stats.N,
    };
  }

  const variance = {
    E: calculateVariance(staff.map(s => assigned[s.id].E)),
    L: calculateVariance(staff.map(s => assigned[s.id].L)),
    N: calculateVariance(staff.map(s => assigned[s.id].N)),
  };

  return {
    assignments,
    roster,
    coverage,
    fairness: {
      staffTotals,
      targets,
      variance,
    },
    violations,
    utilizationReport,
  };
}

// ============================================================================
// VARIANCE CALCULATION
// ============================================================================

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return variance;
}
