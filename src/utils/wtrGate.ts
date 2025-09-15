import { ShiftCode, isWorkCode } from "./constraints";

export interface WeeklySummary {
  weekIndex: number;
  hours: number;
  has24hRest: boolean;
  nightHours: number;
}

export type WeeklySummaries = Record<string /* staffId */, WeeklySummary[]>;

export function checkWeeklyLimits(
  summaries: WeeklySummaries,
  allow48hOptOut = true
) {
  const violations: string[] = [];
  for (const [sid, weeks] of Object.entries(summaries)) {
    for (const w of weeks) {
      if (!w.has24hRest) violations.push(`${sid}: missing 24h rest in week ${w.weekIndex}`);
      if (!allow48hOptOut && w.hours > 48) violations.push(`${sid}: >48h in week ${w.weekIndex}`);
      // Even with opt-out allowed, you may still warn above a threshold (e.g., 60h)
    }
  }
  return violations;
}