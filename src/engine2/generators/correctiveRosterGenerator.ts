import type { ShiftCode } from "@/utils/constraints";
import { createLogger } from "@/utils/errorLogger";
import { calculateRestHours, DEFAULT_SHIFT_TIMES, DEFAULT_WTD_RULES, validateStaffWTD, type ShiftTimes, type WTDRules } from "../constraints/wtdRules";
import { loadTuning } from "@/features/roster/engine/tuning";
import { loadSitePatterns, expandPatternOverRange, type PatternTemplate } from "@/features/roster/patterns";
import { getTenantId } from "@/features/tenant/useTenant";
import { toast } from "@/hooks/use-toast";

const logger = createLogger('CorrectiveRosterGenerator');

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CorrectiveStaffMember {
  id: string;
  name: string;
  availability: Record<string, boolean>; // dateISO -> hard availability (leave, contract limits)
  softPreferences?: {
    avoidDays?: string[];  // ISO dates they prefer not to work
    avoidShifts?: Array<'E' | 'L' | 'N' | 'D'>;  // Shift types they prefer not to work
  };
  isNightEligible?: boolean;
  wtd_opt_out?: boolean; // WTD 48-hour opt-out flag
}

export interface CoverageRequirements {
  [dateISO: string]: {
    E?: number;
    L?: number;
    N?: number;
    D?: number;  // 12h framework day shift
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
  
  // NEW FAIRNESS TUNING PARAMETERS
  fairnessWeight: number;           // Penalty for variance in total hours (0.2-0.4 recommended)
  nightBalanceWeight: number;       // Additional weight for night shift balance (0.2-0.4 recommended)
  rotationPreference: number;       // Bonus for not using same staff consecutively (0-1, default 0.3)
  variancePenaltyStrength: number;  // Multiplier for variance penalty (default 1.0)
  
  // SHIFT TIMING CONFIGURATION
  shiftTimes?: ShiftTimes;         // Optional shift times (defaults to standard 8h shifts)
  
  // SOFT PREFERENCE HANDLING
  preferencePenalty: number;       // Penalty for violating soft preferences (0.1-0.2 recommended)
  
  // DISTRIBUTION TARGETS (per cycle/roster period)
  maxNightsPerCycle: number;       // Maximum nights per staff for the roster period (default 8)
  maxWeekendsPerCycle: number;     // Maximum weekend days per staff for the roster period (default 6)
  distributionPenalty: number;     // Penalty when approaching distribution caps (default 0.5)
}

export interface CorrectiveInput {
  days: string[];  // dateISO array
  staff: CorrectiveStaffMember[];
  requirements: CoverageRequirements;
  policy: CorrectivePolicy;
  framework?: '8h' | '12h'; // Optional framework (defaults to 8h)
  
  // PATTERN-LOCKED MODE
  patternLocked?: boolean;  // If true, use pattern-based duty generation (default: false)
  tenantId?: string;        // Required for pattern resolution when patternLocked=true
  siteId?: string | null;   // Optional site ID for pattern resolution
}

export interface Assignment {
  staffId: string;
  dateISO: string;
  shiftType: 'E' | 'L' | 'N' | 'D';  // D for 12h framework
}

export interface CorrectiveResult {
  assignments: Assignment[];
  roster: Record<string, Record<string, ShiftCode>>; // staffId -> dateISO -> ShiftCode
  coverage: Record<string, { E: number; L: number; N: number; D: number }>;
  fairness: {
    staffTotals: Record<string, { E: number; L: number; N: number; D: number; total: number }>;
    targets: { E: number; L: number; N: number; D: number };
    variance: { E: number; L: number; N: number; D: number };
  };
  violations: string[];
  utilizationReport: Record<string, number>; // staffId -> total assignments
  diagnostics: {
    staffPoolCount: number;
    staffUsedCount: number;
    distributionStats: Record<string, {
      nights: number;
      weekendDays: number;
      totalHours: number;
    }>;
    wtdCompliance?: {
      overallCompliant: boolean;
      avgWeeklyHours: number;
      staffViolations: Array<{
        staffId: string;
        staffName?: string;
        violations: string[];
        optedOut?: boolean;
      }>;
      avgRestCompliancePct: number;
    };
  };
  unfilledShifts?: Array<{ // Diagnostic: why shifts couldn't be filled
    dateISO: string;
    dayIndex: number;
    shift: 'E' | 'L' | 'N' | 'D';
    needed: number;
    filled: number;
    rejectionReasons: string[];
  }>;
}

// ============================================================================
// DEFAULT POLICY
// ============================================================================

/**
 * Get default policy with latest tuning values from localStorage
 */
export function getDefaultPolicy(): CorrectivePolicy {
  const tuning = loadTuning();
  
  return {
    maxConsecDays: tuning.MAX_CONSECUTIVE_DAYS,
    minDaysOffAfterBlock: 2,
    maxConsecNights: tuning.MAX_CONSECUTIVE_NIGHTS,
    minGapHoursBetweenShifts: tuning.MIN_REST_HOURS,
    weeklyHoursCap: 48,
    fairShareWeight: 50,
    nightFairnessWeight: 50,
    preferRestAfterNights: true,
    
    // ENHANCED FAIRNESS PARAMETERS (from tuning)
    fairnessWeight: tuning.FAIRNESS_WEIGHT,
    nightBalanceWeight: tuning.NIGHT_BALANCE_WEIGHT,
    rotationPreference: 0.3,
    variancePenaltyStrength: 1.0,
    
    // SHIFT TIMING (defaults to standard 8h shifts)
    shiftTimes: DEFAULT_SHIFT_TIMES,
    
    // SOFT PREFERENCE HANDLING (from tuning)
    preferencePenalty: tuning.PREFERENCE_PENALTY,
    
    // DISTRIBUTION TARGETS (from tuning)
    maxNightsPerCycle: tuning.MAX_NIGHTS_PER_CYCLE,
    maxWeekendsPerCycle: tuning.MAX_WEEKENDS_PER_CYCLE,
    distributionPenalty: tuning.DISTRIBUTION_PENALTY,
  };
}

export const DEFAULT_CORRECTIVE_POLICY: CorrectivePolicy = getDefaultPolicy();

// ============================================================================
// HELPER: REST HOURS CALCULATION (11h gap enforcement)
// ============================================================================

/**
 * Check if there's sufficient rest between two consecutive shifts
 * Uses actual shift times to calculate rest hours
 */
function hasMinimumRest(
  prevShift: ShiftCode | null, 
  nextShift: 'E' | 'L' | 'N' | 'D',
  shiftTimes: ShiftTimes,
  minRestHours: number
): boolean {
  if (!prevShift || prevShift === 'R') return true;
  if (prevShift !== 'E' && prevShift !== 'L' && prevShift !== 'N' && prevShift !== 'D') return true;
  
  // For 'D' shift, use 'E' times as a proxy (day shift)
  const prevKey = (prevShift === 'D' ? 'E' : prevShift) as 'E' | 'L' | 'N';
  const nextKey = (nextShift === 'D' ? 'E' : nextShift) as 'E' | 'L' | 'N';
  
  const restHours = calculateRestHours(
    shiftTimes[prevKey].end,
    shiftTimes[nextKey].start
  );
  
  return restHours >= minRestHours;
}

// ============================================================================
// ELIGIBILITY CHECK
// ============================================================================

interface EligibilityContext {
  staffId: string;
  dateISO: string;
  shiftType: 'E' | 'L' | 'N' | 'D';
  currentAssignments: Map<string, Map<string, ShiftCode>>; // staffId -> dateISO -> ShiftCode
  staff: CorrectiveStaffMember;
  policy: CorrectivePolicy;
  days: string[];
}

function isEligible(ctx: EligibilityContext): boolean {
  const { staffId, dateISO, shiftType, currentAssignments, staff, policy, days } = ctx;

  // 1. HARD Availability (leave, contract limits) - must be respected
  if (!staff.availability[dateISO]) return false;
  
  // Note: Soft preferences (avoid days/shifts) are NOT checked here
  // They are handled as penalties in the scoring function

  // 2. Night eligibility
  if (shiftType === 'N' && !staff.isNightEligible) return false;

  const staffAssignments = currentAssignments.get(staffId) || new Map();

  // 3. Already assigned on this day
  if (staffAssignments.has(dateISO)) return false;

  const shiftTimes = policy.shiftTimes || DEFAULT_SHIFT_TIMES;
  const dayIndex = days.indexOf(dateISO);

  // 4. Minimum rest hours enforcement (previous day)
  if (dayIndex > 0) {
    const prevDate = days[dayIndex - 1];
    const prevShift = staffAssignments.get(prevDate);
    if (!hasMinimumRest(prevShift || null, shiftType, shiftTimes, policy.minGapHoursBetweenShifts)) {
      return false;
    }
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

  // 1. HARD Availability (leave, contract limits)
  if (!staff.availability[dateISO]) {
    reasons.push('hard-unavailable');
    return { eligible: false, reasons };
  }
  
  // Note: Soft preferences are not rejection reasons - they add penalties instead

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

  const shiftTimes = policy.shiftTimes || DEFAULT_SHIFT_TIMES;
  const dayIndex = days.indexOf(dateISO);

  // 4. Minimum rest hours enforcement (previous day)
  if (dayIndex > 0) {
    const prevDate = days[dayIndex - 1];
    const prevShift = staffAssignments.get(prevDate);
    if (!hasMinimumRest(prevShift || null, shiftType, shiftTimes, policy.minGapHoursBetweenShifts)) {
      reasons.push('insufficient-rest-hours');
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
  shiftType: 'E' | 'L' | 'N' | 'D';
  assigned: Record<string, { E: number; L: number; N: number; D: number }>;
  targets: { E: number; L: number; N: number; D: number };
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
  shiftType: 'E' | 'L' | 'N' | 'D',
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
// SOFT PREFERENCE PENALTY CALCULATION
// ============================================================================

/**
 * Calculate penalty for violating soft preferences
 * Returns 0 if no violation, preferencePenalty value if violated
 */
function calculatePreferencePenalty(
  staff: CorrectiveStaffMember,
  dateISO: string,
  shiftType: 'E' | 'L' | 'N' | 'D',
  policy: CorrectivePolicy
): number {
  if (!staff.softPreferences) return 0;
  
  let penalty = 0;
  
  // Check if this date is in avoid days
  if (staff.softPreferences.avoidDays?.includes(dateISO)) {
    penalty += policy.preferencePenalty;
  }
  
  // Check if this shift type is in avoid shifts
  if (staff.softPreferences.avoidShifts?.includes(shiftType)) {
    penalty += policy.preferencePenalty;
  }
  
  return penalty;
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export function generateCorrectiveRoster(input: CorrectiveInput): CorrectiveResult {
  const framework = input.framework || '8h';
  
  logger.info('Starting corrective roster generation', { 
    staffCount: input.staff.length, 
    dayCount: input.days.length,
    framework,
    patternLocked: input.patternLocked || false,
  });

  const { days, staff, requirements, policy } = input;
  
  // Note: Pattern-locked mode requires async pattern loading
  // It should be handled at a higher level (in the UI/adapter layer)
  // before calling this generator
  if (input.patternLocked) {
    logger.warn('Pattern-locked mode requested but not yet implemented in generator. Use adapter layer for pattern expansion.');
  }
  
  // Framework-aware shift types: 12h uses D/N only, 8h uses E/L/N
  const validShiftTypes = framework === '12h' ? ['D' as const, 'N' as const] : ['E' as const, 'L' as const, 'N' as const];
  logger.info(`Valid shift types for ${framework} framework:`, validShiftTypes);
  
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
  const assigned: Record<string, { E: number; L: number; N: number; D: number }> = {};
  const unfilledShifts: Array<{ dateISO: string; dayIndex: number; shift: 'E' | 'L' | 'N' | 'D'; needed: number; filled: number; rejectionReasons: string[] }> = [];
  
  staff.forEach(s => {
    currentAssignments.set(s.id, new Map());
    assigned[s.id] = { E: 0, L: 0, N: 0, D: 0 };
  });

  // Calculate targets
  const targets = calculateTargets(requirements, staff.length);
  logger.info('Calculated fair-share targets', targets);

  // STEP 1: Allocate in priority order based on framework
  // 12h: N → D only
  // 8h: N → E → L
  const shiftOrder = framework === '12h' 
    ? ['N' as const, 'D' as const] 
    : ['N' as const, 'E' as const, 'L' as const];
  
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

        // ENHANCED FAIRNESS-BASED SORT: Variance minimization + rotation + jitter
        const currentDayIndex = days.indexOf(dateISO);
        
        // Calculate current variance of total hours across all staff (for penalty)
        const allTotals = staff.map(s => {
          const stats = assigned[s.id];
          return (stats.E * 8) + (stats.L * 8) + (stats.N * 8); // Convert to hours
        });
        const meanHours = allTotals.reduce((a, b) => a + b, 0) / allTotals.length;
        const currentVariance = allTotals.reduce((sum, val) => sum + Math.pow(val - meanHours, 2), 0) / allTotals.length;
        
        // Track distribution counts for penalty calculation
        const getStaffDistribution = (staffId: string): { nights: number; weekendDays: number } => {
          const staffMap = currentAssignments.get(staffId)!;
          let nights = 0;
          let weekendDays = 0;
          
          for (const [date, shift] of staffMap.entries()) {
            if (shift === 'N') nights++;
            if ((shift === 'E' || shift === 'L' || shift === 'N' || shift === 'D') && isWeekendDay(date)) {
              weekendDays++;
            }
          }
          
          return { nights, weekendDays };
        };
        
        candidates.sort((a, b) => {
          const aStats = assigned[a.id];
          const bStats = assigned[b.id];
          const targetForShift = targets[shiftType];
          
          // Calculate hours (8h per shift)
          const aHours = (aStats.E * 8) + (aStats.L * 8) + (aStats.N * 8);
          const bHours = (bStats.E * 8) + (bStats.L * 8) + (bStats.N * 8);
          
          // 0. SOFT PREFERENCE PENALTY: Penalize (but don't exclude) preference violations
          //    This allows wider staff pool while respecting preferences when possible
          const aPrefPenalty = calculatePreferencePenalty(a, dateISO, shiftType, policy);
          const bPrefPenalty = calculatePreferencePenalty(b, dateISO, shiftType, policy);
          const prefDiff = aPrefPenalty - bPrefPenalty;
          if (Math.abs(prefDiff) > 0.01) return prefDiff;
          
          // 0.5. DISTRIBUTION PENALTY: Penalize staff approaching nights/weekends caps
          //      This ensures fair distribution of nights and weekend shifts
          const aDist = getStaffDistribution(a.id);
          const bDist = getStaffDistribution(b.id);
          
          // Calculate penalties based on how close to cap
          let aDistPenalty = 0;
          let bDistPenalty = 0;
          
          // Night shift penalty (if assigning a night shift)
          if (shiftType === 'N') {
            const aCapRatio = aDist.nights / policy.maxNightsPerCycle;
            const bCapRatio = bDist.nights / policy.maxNightsPerCycle;
            
            // Exponential penalty as approaching cap (penalty kicks in at 75% of cap)
            if (aCapRatio > 0.75) {
              aDistPenalty += Math.pow(aCapRatio - 0.75, 2) * policy.distributionPenalty * 10;
            }
            if (bCapRatio > 0.75) {
              bDistPenalty += Math.pow(bCapRatio - 0.75, 2) * policy.distributionPenalty * 10;
            }
            
            // Hard block if at cap
            if (aDist.nights >= policy.maxNightsPerCycle) aDistPenalty += 1000;
            if (bDist.nights >= policy.maxNightsPerCycle) bDistPenalty += 1000;
          }
          
          // Weekend penalty (if assigning on weekend)
          if (isWeekendDay(dateISO)) {
            const aCapRatio = aDist.weekendDays / policy.maxWeekendsPerCycle;
            const bCapRatio = bDist.weekendDays / policy.maxWeekendsPerCycle;
            
            // Exponential penalty as approaching cap (penalty kicks in at 75% of cap)
            if (aCapRatio > 0.75) {
              aDistPenalty += Math.pow(aCapRatio - 0.75, 2) * policy.distributionPenalty * 10;
            }
            if (bCapRatio > 0.75) {
              bDistPenalty += Math.pow(bCapRatio - 0.75, 2) * policy.distributionPenalty * 10;
            }
            
            // Hard block if at cap
            if (aDist.weekendDays >= policy.maxWeekendsPerCycle) aDistPenalty += 1000;
            if (bDist.weekendDays >= policy.maxWeekendsPerCycle) bDistPenalty += 1000;
          }
          
          const distDiff = aDistPenalty - bDistPenalty;
          if (Math.abs(distDiff) > 0.01) return distDiff;
          
          // 1. FAIRNESS: Prioritize staff with lower total hours (reduces variance)
          //    Weight: Use fairnessWeight from policy (default 0.3)
          const hoursGap = aHours - bHours;
          const fairnessFactor = hoursGap * policy.fairnessWeight;
          if (Math.abs(fairnessFactor) > 0.1) return fairnessFactor;
          
          // 2. SHIFT-SPECIFIC FAIRNESS: Ratio to target for this shift type
          //    Additional weight for night shifts
          const aRatio = targetForShift > 0 ? aStats[shiftType] / targetForShift : 0;
          const bRatio = targetForShift > 0 ? bStats[shiftType] / targetForShift : 0;
          const ratioWeight = shiftType === 'N' ? policy.nightBalanceWeight : 1.0;
          const ratioDiff = (aRatio - bRatio) * ratioWeight;
          if (Math.abs(ratioDiff) > 0.01) return ratioDiff;
          
          // 3. ROTATION: Prefer staff NOT used on previous day (if applicable)
          //    Weight: Use rotationPreference from policy (default 0.3)
          if (currentDayIndex > 0) {
            const prevDate = days[currentDayIndex - 1];
            const aUsedYesterday = currentAssignments.get(a.id)?.get(prevDate) !== 'R';
            const bUsedYesterday = currentAssignments.get(b.id)?.get(prevDate) !== 'R';
            
            if (aUsedYesterday !== bUsedYesterday) {
              // Prefer staff who rested yesterday
              const rotationBonus = policy.rotationPreference;
              return aUsedYesterday ? rotationBonus : -rotationBonus;
            }
          }
          
          // 4. SHIFT-SPREAD: Last day assigned this specific shift type
          const aLastDay = findLastDayAssigned(currentAssignments.get(a.id)!, shiftType, currentDayIndex, days);
          const bLastDay = findLastDayAssigned(currentAssignments.get(b.id)!, shiftType, currentDayIndex, days);
          if (aLastDay !== bLastDay) return aLastDay - bLastDay;
          
          // 5. DETERMINISTIC JITTER: Tie-breaker (seed-based for reproducibility)
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

  // STEP 4: Corrective pass - insert mandatory REST days where constraints violated
  insertMandatoryRestDays(staff, days, currentAssignments, policy);

  // STEP 5: Build result
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
  let totalE = 0, totalL = 0, totalN = 0, totalD = 0;

  for (const req of Object.values(requirements)) {
    totalE += req.E || 0;
    totalL += req.L || 0;
    totalN += req.N || 0;
    totalD += req.D || 0;
  }

  return {
    E: Math.round(totalE / staffCount),
    L: Math.round(totalL / staffCount),
    N: Math.round(totalN / staffCount),
    D: Math.round(totalD / staffCount),
  };
}

// ============================================================================
// INSERT MANDATORY REST DAYS (CORRECTIVE PASS)
// ============================================================================

/**
 * Corrective pass to enforce rest constraints after initial roster construction
 * Inserts explicit REST days where:
 * 1. MAX_CONSECUTIVE_DAYS would be violated
 * 2. MAX_CONSECUTIVE_NIGHTS would be violated  
 * 3. MIN_REST_HOURS would be violated by next shift
 */
function insertMandatoryRestDays(
  staff: CorrectiveStaffMember[],
  days: string[],
  currentAssignments: Map<string, Map<string, ShiftCode>>,
  policy: CorrectivePolicy
) {
  const shiftTimes = policy.shiftTimes || DEFAULT_SHIFT_TIMES;
  let restDaysInserted = 0;

  for (const s of staff) {
    const staffMap = currentAssignments.get(s.id)!;
    
    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
      const dateISO = days[dayIndex];
      const currentShift = staffMap.get(dateISO);
      
      // Only check working days
      if (!currentShift || currentShift === 'R') continue;
      
      // Check 1: Enforce rest after MAX_CONSECUTIVE_DAYS
      const consecDays = countConsecutiveDaysBackward(s.id, dayIndex, days, staffMap);
      if (consecDays >= policy.maxConsecDays - 1) {
        // Force rest on next day(s)
        for (let i = 1; i <= policy.minDaysOffAfterBlock && dayIndex + i < days.length; i++) {
          const nextDate = days[dayIndex + i];
          const nextShift = staffMap.get(nextDate);
          if (nextShift && nextShift !== 'R') {
            logger.info(`[REST-ENFORCE] Inserting REST for ${s.name} on ${nextDate} (consecutive days limit)`);
            staffMap.set(nextDate, 'R');
            restDaysInserted++;
          }
        }
      }
      
      // Check 2: Enforce rest after MAX_CONSECUTIVE_NIGHTS
      if (currentShift === 'N') {
        const consecNights = countConsecutiveNightsBackward(s.id, dayIndex, days, staffMap);
        if (consecNights >= policy.maxConsecNights - 1 && policy.preferRestAfterNights) {
          // Force rest on next day
          if (dayIndex + 1 < days.length) {
            const nextDate = days[dayIndex + 1];
            const nextShift = staffMap.get(nextDate);
            if (nextShift && nextShift !== 'R') {
              logger.info(`[REST-ENFORCE] Inserting REST for ${s.name} on ${nextDate} (consecutive nights limit)`);
              staffMap.set(nextDate, 'R');
              restDaysInserted++;
            }
          }
        }
      }
      
      // Check 3: Enforce minimum rest hours before next shift
      if (dayIndex + 1 < days.length) {
        const nextDate = days[dayIndex + 1];
        const nextShift = staffMap.get(nextDate);
        
        if (nextShift && nextShift !== 'R' && 
            (currentShift === 'E' || currentShift === 'L' || currentShift === 'N') &&
            (nextShift === 'E' || nextShift === 'L' || nextShift === 'N')) {
          
          if (!hasMinimumRest(currentShift, nextShift, shiftTimes, policy.minGapHoursBetweenShifts)) {
            logger.info(`[REST-ENFORCE] Inserting REST for ${s.name} on ${nextDate} (insufficient rest hours)`);
            staffMap.set(nextDate, 'R');
            restDaysInserted++;
          }
        }
      }
    }
  }

  logger.info(`[REST-ENFORCE] Corrective pass complete: ${restDaysInserted} REST days inserted`);
}

// ============================================================================
// ENSURE ALL STAFF UTILIZED
// ============================================================================

function ensureAllStaffUtilized(
  staff: CorrectiveStaffMember[],
  days: string[],
  currentAssignments: Map<string, Map<string, ShiftCode>>,
  assigned: Record<string, { E: number; L: number; N: number; D: number }>,
  targets: { E: number; L: number; N: number; D: number },
  policy: CorrectivePolicy,
  requirements: CoverageRequirements
) {
  const countAssignments = (staffId: string) => {
    const stats = assigned[staffId];
    return stats.E + stats.L + stats.N + stats.D;
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
      
      const shifts: Array<'E' | 'L' | 'N' | 'D'> = ['E', 'L', 'N', 'D'];
      
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
        
        const shifts: Array<'E' | 'L' | 'N' | 'D'> = ['E', 'L', 'N', 'D'];
        
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
    D: assigned[s.id].D,
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

/**
 * Helper: Check if a date is a weekend (Saturday or Sunday)
 */
function isWeekendDay(dateISO: string): boolean {
  const date = new Date(dateISO);
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

function buildResult(
  staff: CorrectiveStaffMember[],
  days: string[],
  currentAssignments: Map<string, Map<string, ShiftCode>>,
  assigned: Record<string, { E: number; L: number; N: number; D: number }>,
  targets: { E: number; L: number; N: number; D: number },
  requirements: CoverageRequirements,
  unfilledShifts: Array<{ dateISO: string; dayIndex: number; shift: 'E' | 'L' | 'N' | 'D'; needed: number; filled: number; rejectionReasons: string[] }>
): CorrectiveResult {
  const assignments: Assignment[] = [];
  const roster: Record<string, Record<string, ShiftCode>> = {};
  const coverage: Record<string, { E: number; L: number; N: number; D: number }> = {};
  const violations: string[] = [];
  const utilizationReport: Record<string, number> = {};
  const distributionStats: Record<string, { nights: number; weekendDays: number; totalHours: number }> = {};
  
  // Count staff used
  let staffUsedCount = 0;

  // Build assignments and roster
  for (const s of staff) {
    const staffMap = currentAssignments.get(s.id)!;
    roster[s.id] = {};
    let totalAssignments = 0;
    let nightsCount = 0;
    let weekendDaysCount = 0;
    let totalHours = 0;

    for (const [dateISO, shiftCode] of staffMap.entries()) {
      roster[s.id][dateISO] = shiftCode;
      
      if (shiftCode === 'E' || shiftCode === 'L' || shiftCode === 'N' || shiftCode === 'D') {
        assignments.push({ staffId: s.id, dateISO, shiftType: shiftCode });
        totalAssignments++;
        
        // Track nights
        if (shiftCode === 'N') {
          nightsCount++;
        }
        
        // Track weekend days worked
        if (isWeekendDay(dateISO)) {
          weekendDaysCount++;
        }
        
        // Calculate hours (8h for E/L/N, 12h for D)
        if (shiftCode === 'D') {
          totalHours += 12;
        } else {
          totalHours += 8;
        }
      }
    }

    utilizationReport[s.id] = totalAssignments;
    if (totalAssignments > 0) staffUsedCount++;
    
    // Store distribution stats
    distributionStats[s.id] = {
      nights: nightsCount,
      weekendDays: weekendDaysCount,
      totalHours,
    };
  }

  // Calculate coverage
  for (const dateISO of days) {
    coverage[dateISO] = { E: 0, L: 0, N: 0, D: 0 };
    
    for (const s of staff) {
      const shift = roster[s.id][dateISO];
      if (shift === 'E' || shift === 'L' || shift === 'N' || shift === 'D') {
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
      if (req.D && coverage[dateISO].D !== req.D) {
        violations.push(`Coverage mismatch on ${dateISO} for D: got ${coverage[dateISO].D}, needed ${req.D}`);
      }
    }
  }

  // Calculate variance
  const staffTotals: Record<string, { E: number; L: number; N: number; D: number; total: number }> = {};
  for (const s of staff) {
    const stats = assigned[s.id];
    staffTotals[s.id] = {
      ...stats,
      total: stats.E + stats.L + stats.N + stats.D,
    };
  }

  const variance = {
    E: calculateVariance(staff.map(s => assigned[s.id].E)),
    L: calculateVariance(staff.map(s => assigned[s.id].L)),
    N: calculateVariance(staff.map(s => assigned[s.id].N)),
    D: calculateVariance(staff.map(s => assigned[s.id].D)),
  };
  
  // Calculate total hours variance and Gini coefficient for fairness metrics
  const totalHoursPerStaff = staff.map(s => {
    const stats = assigned[s.id];
    return (stats.E * 8) + (stats.L * 8) + (stats.N * 8) + (stats.D * 12); // D is 12h shift
  });
  const hoursVariance = calculateVariance(totalHoursPerStaff);
  const giniCoefficient = calculateGiniCoefficient(totalHoursPerStaff);
  
  // Log comprehensive fairness metrics
  console.info("[FAIRNESS] Distribution variance (shifts):", variance);
  console.info("[FAIRNESS] Total hours variance:", hoursVariance.toFixed(2), "hours²");
  console.info("[FAIRNESS] Gini coefficient:", giniCoefficient.toFixed(3), "(0=perfect equality, 1=perfect inequality)");
  console.info("[FAIRNESS] Staff hours range:", {
    min: Math.min(...totalHoursPerStaff),
    max: Math.max(...totalHoursPerStaff),
    mean: totalHoursPerStaff.reduce((a, b) => a + b, 0) / totalHoursPerStaff.length,
  });
  
  logger.info('Fairness metrics calculated', {
    shiftVariance: variance,
    hoursVariance,
    giniCoefficient,
    staffDistribution: staff.length,
  });

  // ============================================================================
  // WTD COMPLIANCE VALIDATION
  // ============================================================================
  
  logger.info('Starting WTD compliance validation');
  
  const wtdStaffViolations: Array<{
    staffId: string;
    staffName?: string;
    violations: string[];
    optedOut?: boolean;
  }> = [];
  
  let totalHoursForAvg = 0;
  let staffCountForAvg = 0;
  let compliantStaffCount = 0;
  
  for (const s of staff) {
    const staffMap = currentAssignments.get(s.id)!;
    
    // Build sequence of shift codes for this staff member
    const staffAssignments: string[] = days.map(d => staffMap.get(d) || 'R');
    
    // Validate WTD compliance for this staff member
    const wtdResult = validateStaffWTD(
      staffAssignments,
      DEFAULT_WTD_RULES,
      DEFAULT_SHIFT_TIMES,
      s.wtd_opt_out ?? false // Use staff's WTD opt-out status
    );
    
    // Calculate weekly hours for this staff member
    const workedShifts = staffAssignments.filter(code => code !== 'R' && code !== '').length;
    const hoursPerShift = staffAssignments.some(c => c === 'D') ? 12 : 8; // Detect 12h mode
    const totalHours = workedShifts * hoursPerShift;
    const weeks = days.length / 7;
    const avgWeeklyHours = totalHours / weeks;
    
    totalHoursForAvg += avgWeeklyHours;
    staffCountForAvg++;
    
    if (!wtdResult.valid) {
      // Record the opted-out status from staff data
      const hasOptedOut = s.wtd_opt_out ?? false;
      
      wtdStaffViolations.push({
        staffId: s.id,
        staffName: s.name,
        violations: wtdResult.violations,
        optedOut: hasOptedOut,
      });
      
      // Only log warning for non-opted-out staff
      if (!hasOptedOut) {
        logger.warn('WTD violations detected for non-opted-out staff', {
          staffId: s.id,
          staffName: s.name,
          violations: wtdResult.violations,
        });
        
        // Show toast warning for non-opted-out staff with violations
        toast({
          title: "⚠️ WTD Limit Exceeded",
          description: `${s.name} exceeds WTD working time limits. Consider reviewing their schedule.`,
          variant: "default",
        });
      } else {
        logger.info('WTD check skipped for opted-out staff', {
          staffId: s.id,
          staffName: s.name,
        });
      }
    } else {
      compliantStaffCount++;
    }
  }
  
  const avgWeeklyHours = staffCountForAvg > 0 ? totalHoursForAvg / staffCountForAvg : 0;
  const avgRestCompliancePct = staffCountForAvg > 0 
    ? (compliantStaffCount / staffCountForAvg) * 100 
    : 100;
  
  const overallWTDCompliant = wtdStaffViolations.length === 0;
  
  logger.info('WTD compliance validation complete', {
    overallCompliant: overallWTDCompliant,
    avgWeeklyHours: avgWeeklyHours.toFixed(1),
    staffViolations: wtdStaffViolations.length,
    compliancePct: avgRestCompliancePct.toFixed(1),
  });
  
  // Show toast if non-compliant (warning, not error - to support opt-outs)
  if (!overallWTDCompliant) {
    toast({
      title: '⚠️ WTD Compliance Warning',
      description: `${wtdStaffViolations.length} staff member(s) exceed WTD limits. Review roster for opt-out status or adjust pattern.`,
      variant: 'default', // Yellow warning
    });
  }

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
      distributionStats,
      wtdCompliance: {
        overallCompliant: overallWTDCompliant,
        avgWeeklyHours,
        staffViolations: wtdStaffViolations,
        avgRestCompliancePct,
      },
    },
    unfilledShifts: unfilledShifts.length > 0 ? unfilledShifts : undefined,
  };
}

// ============================================================================
// VARIANCE & GINI COEFFICIENT CALCULATORS
// ============================================================================

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return variance;
}

/**
 * Calculate Gini coefficient - measure of statistical dispersion
 * 0 = perfect equality (everyone has same hours)
 * 1 = perfect inequality (one person has all hours)
 */
function calculateGiniCoefficient(values: number[]): number {
  if (values.length === 0) return 0;
  
  // Sort values
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  // Handle edge case where all values are zero
  const total = sorted.reduce((sum, v) => sum + v, 0);
  if (total === 0) return 0;
  
  // Calculate Gini coefficient
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (i + 1) * sorted[i];
  }
  
  const gini = (2 * sum) / (n * total) - (n + 1) / n;
  return gini;
}
