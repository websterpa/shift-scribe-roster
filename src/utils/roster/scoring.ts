import { ShiftCode, isWorkCode } from "../constraints";

export interface PersonStats {
  nights: number;
  weekends: number;
  publicHolidaysWorked: number;
  totalHours: number;
}
export interface ScoreWeights {
  uncoveredPenalty: number;   // big
  leaveClashPenalty: number; // big
  restViolationPenalty: number; // big
  supervisorNightPenalty: number; // big unless override
  fairnessNightWeight: number;
  fairnessWeekendWeight: number;
  phCapPenalty: number; // big if exceeded
  budgetDeviationWeight: number; // small unless budget set
}

export interface ScoreContext {
  budget?: number | null;
  totalCost: number;
  statsByStaff: Record<string, PersonStats>;
  uncoveredByDayShift: number; // count
  leaveClashes: number;
  restViolations: number;
  supervisorNightViolations: number;
  phCapExceeded: number; // count of staff exceeding cap
  nightsVariance: number; // variance across staff
  weekendsVariance: number; // variance across staff
}

export function score(ctx: ScoreContext, w: ScoreWeights): number {
  let s = 0;
  s += w.uncoveredPenalty * ctx.uncoveredByDayShift;
  s += w.leaveClashPenalty * ctx.leaveClashes;
  s += w.restViolationPenalty * ctx.restViolations;
  s += w.supervisorNightPenalty * ctx.supervisorNightViolations;
  s += w.fairnessNightWeight * ctx.nightsVariance;
  s += w.fairnessWeekendWeight * ctx.weekendsVariance;
  s += w.phCapPenalty * ctx.phCapExceeded;

  if (ctx.budget != null) {
    const dev = Math.max(0, ctx.totalCost - ctx.budget);
    s += w.budgetDeviationWeight * dev;
  }
  return s;
}