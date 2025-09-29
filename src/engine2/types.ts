export type Money = number; // in major units (e.g., GBP)
export type Hours = number;

export type DateTimeISO = string; // ISO-8601

export type SegmentTag =
  | "DAY"
  | "NIGHT"
  | "WEEKEND"
  | "PUBLIC_HOLIDAY"
  | "OT_BAND1"
  | "OT_BAND2";

export interface Segment {
  start: Date;        // inclusive
  end: Date;          // exclusive
  tags: SegmentTag[]; // derived from rules/calendar
}

export interface ShiftSpec {
  start: Date;
  end: Date;
  roleId?: string;
  siteId?: string;
  flatShiftPay?: Money; // e.g., £20 night allowance per shift
}

export interface Differential { // % uplift
  tag: Exclude<SegmentTag, "OT_BAND1" | "OT_BAND2">;
  percentage: number; // e.g., 0.30 for +30%
}

export interface PremiumMultiplier {
  tag: SegmentTag;    // often WEEKEND or PUBLIC_HOLIDAY, sometimes NIGHT
  multiplier: number; // e.g., 1.5, 2.0
}

export type StackingPolicy =
  | { kind: "MAX_OF"; components: ("DIFF" | "MULTIPLIER")[]; includeFlat: boolean }
  | { kind: "SUM"; includeFlat: boolean } // add diff% and multiplier together
  | { kind: "PRECEDENCE"; order: ("FLAT" | "MULTIPLIER" | "DIFF")[] }; // first wins

export interface RatePolicy {
  baseHourly: Money;
  differentials: Differential[];        // by tag
  premiumMultipliers: PremiumMultiplier[]; // by tag
  stacking: StackingPolicy;
  allowances?: { code: string; amount: Money }[];
}

export interface Holiday {
  dateISO: string;         // YYYY-MM-DD (local)
  isPublicHoliday: boolean;
  toilEntitlementDays?: number; // kept for TOIL ledger integration (not expanded here)
}

export interface ExplainLine {
  code: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface CostBreakdown {
  base: Money;
  differential: Money;
  premium: Money;
  flatShiftPay: Money;
  allowances: Money;
  total: Money;
  lines: ExplainLine[];
}

export interface RestRules {
  minDailyRestHours: number;   // e.g., 11
  minWeeklyRestHours: number;  // e.g., 24 or 35
  maxWeeklyHours?: number;     // optional cap
}

export interface Assignment {
  staffId: string;
  shift: ShiftSpec;
}