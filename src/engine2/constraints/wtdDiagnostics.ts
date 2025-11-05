/**
 * WTD Rest Diagnostics
 * Precise analysis of rest periods between shifts, with day-level violation tracking
 */

export interface ShiftTimesConfig {
  // 8h shifts
  E?: { start: string; end: string };
  L?: { start: string; end: string };
  N?: { start: string; end: string };
  // 12h shifts
  D?: { start: string; end: string };
}

export const DEFAULT_8H_TIMES: ShiftTimesConfig = {
  E: { start: '06:00', end: '14:00' },
  L: { start: '14:00', end: '22:00' },
  N: { start: '22:00', end: '06:00' },
};

export const DEFAULT_12H_TIMES: ShiftTimesConfig = {
  D: { start: '07:00', end: '19:00' },
  N: { start: '19:00', end: '07:00' },
};

export interface ShiftEvent {
  idx: number;
  code: string;
  start: Date;
  end: Date;
}

export interface RestViolation {
  fromIdx: number;
  toIdx: number;
  fromCode: string;
  toCode: string;
  restHours: number;
  rule: string;
}

export interface PatternDiagnostics {
  violations: RestViolation[];
  timeline: ShiftEvent[];
}

/**
 * Parse time string to minutes from midnight
 */
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Calculate hours between two Date objects
 */
function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

/**
 * Build timeline of shift events from pattern sequence
 */
export function buildTimeline(
  sequence: string[],
  shiftTimes: ShiftTimesConfig,
  startDate: Date = new Date(2024, 0, 1) // arbitrary baseline
): ShiftEvent[] {
  const timeline: ShiftEvent[] = [];
  
  for (let i = 0; i < sequence.length; i++) {
    const code = sequence[i];
    if (code === 'R' || !code) continue; // Skip rest days
    
    const shiftDef = shiftTimes[code as keyof ShiftTimesConfig];
    if (!shiftDef) {
      console.warn(`No shift definition for code: ${code}`);
      continue;
    }
    
    const startMinutes = timeToMinutes(shiftDef.start);
    const endMinutes = timeToMinutes(shiftDef.end);
    
    // Calculate start datetime (day i at shift start time)
    const dayStart = new Date(startDate);
    dayStart.setDate(startDate.getDate() + i);
    dayStart.setHours(0, 0, 0, 0);
    const shiftStart = new Date(dayStart.getTime() + startMinutes * 60 * 1000);
    
    // Calculate end datetime
    let shiftEnd: Date;
    if (endMinutes < startMinutes) {
      // Overnight shift (e.g., N: 22:00 → 06:00)
      const nextDay = new Date(dayStart);
      nextDay.setDate(dayStart.getDate() + 1);
      shiftEnd = new Date(nextDay.getTime() + endMinutes * 60 * 1000);
    } else {
      // Same day shift
      shiftEnd = new Date(dayStart.getTime() + endMinutes * 60 * 1000);
    }
    
    timeline.push({
      idx: i,
      code,
      start: shiftStart,
      end: shiftEnd,
    });
  }
  
  return timeline;
}

/**
 * Find rest violations in a shift timeline
 * Rest is measured from END of previous worked shift to START of next worked shift
 */
export function findRestViolations(
  timeline: ShiftEvent[],
  minRestHours: number = 11
): RestViolation[] {
  const violations: RestViolation[] = [];
  
  for (let i = 0; i < timeline.length - 1; i++) {
    const current = timeline[i];
    const next = timeline[i + 1];
    
    const restHours = hoursBetween(current.end, next.start);
    
    if (restHours < minRestHours) {
      violations.push({
        fromIdx: current.idx,
        toIdx: next.idx,
        fromCode: current.code,
        toCode: next.code,
        restHours,
        rule: '11h-min-rest',
      });
    }
  }
  
  return violations;
}

/**
 * Main diagnostic function
 */
export function diagnosePattern(
  sequence: string[],
  opts: {
    shiftSystem?: '8h' | '12h';
    customTimes?: ShiftTimesConfig;
    minRestHours?: number;
  } = {}
): PatternDiagnostics {
  console.log('🔬 Diagnosing pattern:', { sequence, opts });
  
  const shiftSystem = opts.shiftSystem || '8h';
  const defaultTimes = shiftSystem === '12h' ? DEFAULT_12H_TIMES : DEFAULT_8H_TIMES;
  const shiftTimes = { ...defaultTimes, ...opts.customTimes };
  const minRestHours = opts.minRestHours ?? 11;
  
  const timeline = buildTimeline(sequence, shiftTimes);
  const violations = findRestViolations(timeline, minRestHours);
  
  console.log('📊 Diagnostics complete:', { 
    timelineEvents: timeline.length, 
    violations: violations.length 
  });
  
  return {
    violations,
    timeline,
  };
}
