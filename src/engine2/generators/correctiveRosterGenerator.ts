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
  diagnostics: {
    staffPoolCount: number;
    staffUsedCount: number;
  };
  unfilledShifts?: Array<{ // Diagnostic: why shifts couldn't be filled
    dateISO: string;
    dayIndex: number;
    shift: 'E' | 'L' | 'N';
    needed: number;
    filled: number;
    rejectionReasons: string[];
  }>;
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

// Enhanced eligibility check that returns rejection reasons
function checkEligibilityWithReasons(ctx: EligibilityContext): { eligible: boolean; reasons: string[] } {
  const { staffId, dateISO, shiftType, currentAssignments, staff, policy, days } = ctx;
  const reasons: string[] = [];

  // 1. Availability
  if (!staff.availability[dateISO]) {
    reasons.push('unavailable');
    return { eligible: false, reasons };
  }

  // 2. Night eligibility
  if (shiftType === 'N' && !staff.isNightEligible) {
    reasons.push('not-night-eligible');
    return { eligible: false, reasons };
  }

  const staffAssignments = currentAssignments.get(staffId) || new Map();

  // 3. Already assigned on this day
  if (staffAssignments.has(dateISO)) {
    reasons.push('already-assigned');
    return { eligible: false, reasons };
  }

  // 4. Illegal turnaround (previous day)
  const dayIndex = days.indexOf(dateISO);
  if (dayIndex > 0) {
    const prevDate = days[dayIndex - 1];
    const prevShift = staffAssignments.get(prevDate);
    if (isIllegalTurnaround(prevShift || null, shiftType)) {
      reasons.push('illegal-turnaround');
      return { eligible: false, reasons };
    }
  }

  // 5. Consecutive days limit
  const consecDays = countConsecutiveDaysBackward(staffId, dayIndex, days, staffAssignments);
  if (consecDays >= policy.maxConsecDays) {
    reasons.push('max-consec-days');
    return { eligible: false, reasons };
  }

  // 6. Consecutive nights limit
  if (shiftType === 'N') {
    const consecNights = countConsecutiveNightsBackward(staffId, dayIndex, days, staffAssignments);
    if (consecNights >= policy.maxConsecNights) {
      reasons.push('max-consec-nights');
      return { eligible: false, reasons };
    }
  }

  return { eligible: true, reasons: [] };
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

// Deterministic jitter for tie-breaking to avoid always picking the same staff
function jitter(seed: number, dayIndex: number, staffId: string): number {
  // Convert staffId to numeric hash
  let idHash = 0;
  for (let i = 0; i < staffId.length; i++) {
    idHash = ((idHash << 5) - idHash) + staffId.charCodeAt(i);
    idHash = idHash & idHash; // Convert to 32bit integer
  }
  
  // Mix seed, day, and staffId
  let x = Math.imul(seed ^ dayIndex ^ idHash, 2654435761) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 2246822519) >>> 0;
  return (x >>> 8) / 1e9;
}

// Find the last day index when this staff was assigned this specific shift type
function findLastDayAssigned(
  staffAssignments: Map<string, ShiftCode>,
  shiftType: 'E' | 'L' | 'N',
  currentDayIndex: number,
  days: string[]
): number {
  for (let i = currentDayIndex - 1; i >= 0; i--) {
    if (staffAssignments.get(days[i]) === shiftType) {
      return i;
    }
  }
  return -999; // Never assigned this shift type
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
  
  // Generate seed for deterministic jitter (based on first day)
  let seed = 0;
  if (days.length > 0) {
    for (let i = 0; i < days[0].length; i++) {
      seed = ((seed << 5) - seed) + days[0].charCodeAt(i);
      seed = seed & seed; // Convert to 32bit integer
    }
  }
  
  // Initialize tracking
  const currentAssignments = new Map<string, Map<string, ShiftCode>>();
  const assigned: Record<string, { E: number; L: number; N: number }> = {};
  const unfilledShifts: Array<{ dateISO: string; dayIndex: number; shift: 'E' | 'L' | 'N'; needed: number; filled: number; rejectionReasons: string[] }> = [];
  
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
          // Collect rejection reasons from all staff
          const allReasons = new Set<string>();
          staff.forEach(s => {
            const check = checkEligibilityWithReasons({
              staffId: s.id,
              dateISO,
              shiftType,
              currentAssignments,
              staff: s,
              policy,
              days,
            });
            check.reasons.forEach(r => allReasons.add(r));
          });
          
          unfilledShifts.push({
            dateISO,
            dayIndex: days.indexOf(dateISO),
            shift: shiftType,
            needed,
            filled,
            rejectionReasons: Array.from(allReasons),
          });
          
          logger.warn(`No eligible staff for ${shiftType} on ${dateISO}`, { filled, needed, reasons: Array.from(allReasons) });
          break;
        }

        // ROTATION-FRIENDLY SORT: Order by fairness, spread, and jitter
        const currentDayIndex = days.indexOf(dateISO);
        candidates.sort((a, b) => {
          const aStats = assigned[a.id];
          const bStats = assigned[b.id];
          const targetForShift = targets[shiftType];
          
          // 1. Fairness ratio: assigned/target for this specific shift type
          const aRatio = targetForShift > 0 ? aStats[shiftType] / targetForShift : 0;
          const bRatio = targetForShift > 0 ? bStats[shiftType] / targetForShift : 0;
          if (Math.abs(aRatio - bRatio) > 0.01) return aRatio - bRatio;
          
          // 2. Last day assigned this specific shift type (encourage spread)
          const aLastDay = findLastDayAssigned(currentAssignments.get(a.id)!, shiftType, currentDayIndex, days);
          const bLastDay = findLastDayAssigned(currentAssignments.get(b.id)!, shiftType, currentDayIndex, days);
          if (aLastDay !== bLastDay) return aLastDay - bLastDay;
          
          // 3. Total assignments (overall fairness)
          const aTotal = aStats.E + aStats.L + aStats.N;
          const bTotal = bStats.E + bStats.L + bStats.N;
          if (aTotal !== bTotal) return aTotal - bTotal;
          
          // 4. Deterministic jitter (tie-breaker to avoid always picking same staff)
          return jitter(seed, currentDayIndex, a.id) - jitter(seed, currentDayIndex, b.id);
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
  const result = buildResult(staff, days, currentAssignments, assigned, targets, requirements, unfilledShifts);

  logger.info('Corrective roster generation complete', {
    totalAssignments: result.assignments.length,
    violations: result.violations.length,
    unfilledShifts: unfilledShifts.length,
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
  const countAssignments = (staffId: string) => {
    const stats = assigned[staffId];
    return stats.E + stats.L + stats.N;
  };

  const unused = staff.filter(s => countAssignments(s.id) === 0);

  if (unused.length === 0) {
    logger.info('All staff already utilized');
    return;
  }

  logger.info('Ensuring all staff utilized', { 
    unusedCount: unused.length,
    unusedStaff: unused.map(s => s.name)
  });

  for (const u of unused) {
    let wasAssigned = false;

    // STRATEGY 1: Try simple assignment (add to unfilled spot)
    for (const dateISO of days) {
      if (wasAssigned) break;
      
      const shifts: Array<'E' | 'L' | 'N'> = ['E', 'L', 'N'];
      
      for (const shiftType of shifts) {
        if (isEligible({
          staffId: u.id,
          dateISO,
          shiftType,
          currentAssignments,
          staff: u,
          policy,
          days,
        })) {
          // Check if this would overfill coverage
          const currentCoverage = staff.filter(s => {
            const shift = currentAssignments.get(s.id)?.get(dateISO);
            return shift === shiftType;
          }).length;
          const needed = requirements[dateISO]?.[shiftType] || 0;

          if (currentCoverage < needed) {
            // Safe to add without overfilling
            currentAssignments.get(u.id)!.set(dateISO, shiftType);
            assigned[u.id][shiftType]++;
            logger.info(`[UTILISATION] Simple add: ${u.name} → ${shiftType} on ${dateISO}`);
            wasAssigned = true;
            break;
          }
        }
      }
    }

    // STRATEGY 2: If simple add failed, try swapping with over-utilized staff
    if (!wasAssigned) {
      for (const dateISO of days) {
        if (wasAssigned) break;
        
        const shifts: Array<'E' | 'L' | 'N'> = ['E', 'L', 'N'];
        
        for (const shiftType of shifts) {
          if (wasAssigned) break;

          // Check if unused staff is eligible for this shift
          if (!isEligible({
            staffId: u.id,
            dateISO,
            shiftType,
            currentAssignments,
            staff: u,
            policy,
            days,
          })) continue;

          // Find candidates who are currently assigned this shift and are over target
          const candidates = staff.filter(s => {
            if (s.id === u.id) return false;
            const shift = currentAssignments.get(s.id)?.get(dateISO);
            if (shift !== shiftType) return false;
            
            // Check if they're over their target for this shift type
            const currentCount = assigned[s.id][shiftType];
            const target = targets[shiftType];
            return currentCount > target;
          });

          if (candidates.length === 0) continue;

          // Sort by how far over target they are
          candidates.sort((a, b) => {
            const aOverage = assigned[a.id][shiftType] - targets[shiftType];
            const bOverage = assigned[b.id][shiftType] - targets[shiftType];
            return bOverage - aOverage;
          });

          const swapCandidate = candidates[0];
          
          // Perform the swap
          currentAssignments.get(swapCandidate.id)!.set(dateISO, 'R'); // Replace with rest
          assigned[swapCandidate.id][shiftType]--;
          
          currentAssignments.get(u.id)!.set(dateISO, shiftType);
          assigned[u.id][shiftType]++;
          
          logger.info(`[UTILISATION] Swap: ${u.name} ↔ ${swapCandidate.name} for ${shiftType} on ${dateISO}`);
          wasAssigned = true;
          break;
        }
      }
    }

    if (!wasAssigned) {
      logger.warn(`[UTILISATION] Failed to assign ${u.name} - no eligible slots or swaps available`);
    }
  }

  // Log final utilization summary
  const utilSummary = staff.map(s => ({
    name: s.name,
    total: countAssignments(s.id),
    E: assigned[s.id].E,
    L: assigned[s.id].L,
    N: assigned[s.id].N,
  }));
  
  console.info("[UTILISATION] Final assignment counts:", utilSummary);
  logger.info('Utilization pass complete', { 
    staffWithZero: utilSummary.filter(s => s.total === 0).length,
    summary: utilSummary 
  });
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
  requirements: CoverageRequirements,
  unfilledShifts: Array<{ dateISO: string; dayIndex: number; shift: 'E' | 'L' | 'N'; needed: number; filled: number; rejectionReasons: string[] }>
): CorrectiveResult {
  const assignments: Assignment[] = [];
  const roster: Record<string, Record<string, ShiftCode>> = {};
  const coverage: Record<string, { E: number; L: number; N: number }> = {};
  const violations: string[] = [];
  const utilizationReport: Record<string, number> = {};
  
  // Count staff used
  let staffUsedCount = 0;

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
    if (totalAssignments > 0) staffUsedCount++;
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
    diagnostics: {
      staffPoolCount: staff.length,
      staffUsedCount,
    },
    unfilledShifts: unfilledShifts.length > 0 ? unfilledShifts : undefined,
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
