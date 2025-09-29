import { clampToMidnightBoundaries, isWeekend, hoursBetween, getLocalDateISO } from "../utils/dateMath";
import type { Segment, SegmentTag, ShiftSpec, Holiday } from "../types";

/**
 * Expand a shift into contiguous non-overlapping segments split by midnight
 * and tagged for NIGHT, WEEKEND, PUBLIC_HOLIDAY, DAY.
 * NIGHT tag rule default: local 22:00–06:00.
 * Caller may later add OT_BAND tags depending on thresholds.
 */
export interface ExpandOptions {
  nightStartHour?: number; // default 22
  nightEndHour?: number;   // default 6
  holidays?: Holiday[];    // local-date matches
}

function isNightHour(localHour: number, nightStart: number, nightEnd: number): boolean {
  // Night spans across midnight by default (e.g., 22-06)
  if (nightStart <= nightEnd) {
    return localHour >= nightStart && localHour < nightEnd;
  } else {
    return localHour >= nightStart || localHour < nightEnd;
  }
}

function tagAt(date: Date, nightStart: number, nightEnd: number, holidays?: Holiday[]): SegmentTag[] {
  const tags: SegmentTag[] = [];
  const h = date.getHours();
  
  if (isNightHour(h, nightStart, nightEnd)) tags.push("NIGHT");
  if (isWeekend(date)) tags.push("WEEKEND");
  
  const dateISO = getLocalDateISO(date);
  if (holidays?.some(hd => hd.isPublicHoliday && hd.dateISO === dateISO)) {
    tags.push("PUBLIC_HOLIDAY");
  }
  
  if (tags.length === 0) tags.push("DAY");
  return tags;
}

export function expandShift(shift: ShiftSpec, opts?: ExpandOptions): Segment[] {
  const nightStart = opts?.nightStartHour ?? 22;
  const nightEnd = opts?.nightEndHour ?? 6;

  const boundaries = clampToMidnightBoundaries(shift.start, shift.end);
  const segs: Segment[] = [];
  
  for (let i = 0; i < boundaries.length - 1; i++) {
    const a = boundaries[i];
    const b = boundaries[i + 1];
    
    // further micro-segmentation at hour boundaries where tag changes could happen
    let cursor = new Date(a.getTime());
    while (cursor < b) {
      const currentTags = tagAt(cursor, nightStart, nightEnd, opts?.holidays);
      
      // advance to next hour or to b, whichever first
      const next = new Date(cursor.getTime());
      next.setHours(next.getHours() + 1, 0, 0, 0);
      const end = next <= b ? next : b;
      
      segs.push({ start: new Date(cursor.getTime()), end, tags: currentTags.slice() });
      cursor = end;
    }
  }
  
  // coalesce adjacent segments with identical tags to reduce noise
  const out: Segment[] = [];
  for (const s of segs) {
    const last = out[out.length - 1];
    if (last && arraysEqual(last.tags, s.tags) && last.end.getTime() === s.start.getTime()) {
      last.end = s.end;
    } else {
      out.push({ ...s });
    }
  }
  
  // sanity: no zero/negative durations
  return out.filter(s => hoursBetween(s.start, s.end) > 0);
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}