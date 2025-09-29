import { hoursBetween, overlaps } from "../utils/dateMath";
import type { Assignment, RestRules, ExplainLine } from "../types";

/**
 * Validate rest constraints for a person's assignments.
 * Returns an array of explain lines (empty = OK).
 */
export function validateRest(assignments: Assignment[], rules: RestRules): ExplainLine[] {
  const lines: ExplainLine[] = [];
  const sorted = [...assignments].sort((a, b) => a.shift.start.getTime() - b.shift.start.getTime());

  // Daily rest: gap between end of a shift and start of next
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i].shift;
    const nxt = sorted[i + 1].shift;
    const gap = hoursBetween(cur.end, nxt.start);
    if (gap < rules.minDailyRestHours) {
      lines.push({
        code: "REST_DAILY",
        message: `Daily rest shortfall: ${gap.toFixed(2)}h < ${rules.minDailyRestHours}h`,
        meta: { from: cur.end.toISOString(), to: nxt.start.toISOString() }
      });
    }
  }

  // Weekly rest: simple rolling 7-day window from first assignment start
  const start0 = sorted[0]?.shift.start;
  if (start0 && rules.minWeeklyRestHours > 0) {
    const weekEnd = new Date(start0.getTime() + 7 * 24 * 3600 * 1000);
    // compute the biggest continuous rest block within [start0, weekEnd)
    // naive approach: consider gaps between all busy intervals
    const busy: Array<{ s: Date; e: Date }> = sorted.map(a => ({ s: a.shift.start, e: a.shift.end }));
    
    // merge overlaps
    busy.sort((a, b) => a.s.getTime() - b.s.getTime());
    const merged: Array<{ s: Date; e: Date }> = [];
    for (const b of busy) {
      const last = merged[merged.length - 1];
      if (!last || last.e <= b.s) merged.push({ ...b });
      else if (b.e > last.e) last.e = b.e;
    }
    
    const windows: Array<{ s: Date; e: Date }> = [];
    // rest from window start to first busy
    const wStart = start0;
    const wEnd = weekEnd;
    let cursor = wStart;
    for (const m of merged) {
      if (m.s > cursor) windows.push({ s: cursor, e: m.s });
      cursor = m.e > cursor ? m.e : cursor;
    }
    if (cursor < wEnd) windows.push({ s: cursor, e: wEnd });
    
    const maxRest = Math.max(...windows.map(w => (w.e.getTime() - w.s.getTime()) / 3600000), 0);
    if (maxRest < rules.minWeeklyRestHours) {
      lines.push({ 
        code: "REST_WEEKLY", 
        message: `Weekly rest shortfall: ${maxRest.toFixed(2)}h < ${rules.minWeeklyRestHours}h` 
      });
    }
  }

  if (rules.maxWeeklyHours) {
    // naive sum within a rolling 7-day window from first shift
    const weekEnd = new Date(sorted[0].shift.start.getTime() + 7 * 24 * 3600 * 1000);
    let hours = 0;
    for (const a of sorted) {
      const s = a.shift.start;
      const e = a.shift.end;
      if (s < weekEnd) {
        const end = e < weekEnd ? e : weekEnd;
        hours += (end.getTime() - s.getTime()) / 3600000;
      }
    }
    if (hours > rules.maxWeeklyHours) {
      lines.push({ 
        code: "MAX_WEEKLY", 
        message: `Weekly hours exceeded: ${hours.toFixed(2)}h > ${rules.maxWeeklyHours}h` 
      });
    }
  }

  // Overlaps check
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i].shift;
    const b = sorted[i + 1].shift;
    if (overlaps(a.start, a.end, b.start, b.end)) {
      lines.push({ 
        code: "OVERLAP", 
        message: "Shifts overlap", 
        meta: { a: a.start.toISOString(), b: b.start.toISOString() } 
      });
    }
  }

  return lines;
}