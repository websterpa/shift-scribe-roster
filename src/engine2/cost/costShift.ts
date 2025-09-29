import { hoursBetween } from "../utils/dateMath";
import type {
  CostBreakdown,
  Money,
  RatePolicy,
  Segment,
  SegmentTag,
  ShiftSpec,
  ExplainLine,
} from "../types";

function pickDiffPercent(tags: SegmentTag[], rates: RatePolicy): number {
  let pct = 0;
  for (const d of rates.differentials) {
    if (tags.includes(d.tag)) {
      pct = Math.max(pct, d.percentage); // choose the highest applicable diff by default
    }
  }
  return pct;
}

function pickMultiplier(tags: SegmentTag[], rates: RatePolicy): number {
  let mult = 1;
  for (const p of rates.premiumMultipliers) {
    if (tags.includes(p.tag)) {
      mult = Math.max(mult, p.multiplier); // choose the highest applicable multiplier by default
    }
  }
  return mult;
}

export interface CostOptions {
  otBandTagger?: (seg: Segment) => SegmentTag[]; // can append OT_BAND* tags externally
}

export function costShift(shift: ShiftSpec, segments: Segment[], rates: RatePolicy, opts?: CostOptions): CostBreakdown {
  const lines: ExplainLine[] = [];
  let base: Money = 0;
  let diffVal: Money = 0;
  let premVal: Money = 0;

  for (const seg of segments) {
    const hours = hoursBetween(seg.start, seg.end);
    const tags = [...seg.tags, ...((opts?.otBandTagger?.(seg)) ?? [])];
    const diffPct = pickDiffPercent(tags, rates);
    const mult = pickMultiplier(tags, rates);

    const baseThis = hours * rates.baseHourly;
    let lineBase = baseThis;
    let lineDiff = baseThis * diffPct;
    let linePrem = baseThis * (mult - 1);

    if (rates.stacking.kind === "MAX_OF") {
      const candidates: { name: "DIFF" | "MULTIPLIER"; val: number }[] = [];
      if (rates.stacking.components.includes("DIFF")) candidates.push({ name: "DIFF", val: lineDiff });
      if (rates.stacking.components.includes("MULTIPLIER")) candidates.push({ name: "MULTIPLIER", val: linePrem });
      const max = candidates.sort((a, b) => b.val - a.val)[0]?.name;
      if (max === "DIFF") linePrem = 0;
      if (max === "MULTIPLIER") lineDiff = 0;
    } else if (rates.stacking.kind === "PRECEDENCE") {
      // zero out others after the first applicable
      for (const k of rates.stacking.order) {
        if (k === "FLAT") continue;
        if (k === "MULTIPLIER" && linePrem > 0) { lineDiff = 0; break; }
        if (k === "DIFF" && lineDiff > 0) { linePrem = 0; break; }
      }
    } // SUM keeps both

    base += lineBase;
    diffVal += lineDiff;
    premVal += linePrem;

    if (lineDiff > 0) lines.push({ code: "DIFF", message: "Applied differential %", meta: { hours, diffPct } });
    if (linePrem > 0) lines.push({ code: "PREM", message: "Applied premium multiplier", meta: { hours, mult } });
  }

  const flat = shift.flatShiftPay ?? 0;
  const allowances = (rates.allowances ?? []).reduce((acc, a) => acc + a.amount, 0);

  // Stacking policy may exclude flat
  let flatApplied = flat;
  if (rates.stacking.kind === "MAX_OF" && !rates.stacking.includeFlat) flatApplied = 0;
  if (rates.stacking.kind === "PRECEDENCE" && rates.stacking.order[0] !== "FLAT") {
    // if FLAT not first, it may be excluded; keep simple: include only when first
    flatApplied = 0;
  }

  const total = base + diffVal + premVal + flatApplied + allowances;

  if (flatApplied > 0) lines.push({ code: "FLAT", message: "Applied flat shift pay", meta: { amount: flatApplied } });
  if (allowances > 0) lines.push({ code: "ALLOW", message: "Applied allowances", meta: { amount: allowances } });

  return { base, differential: diffVal, premium: premVal, flatShiftPay: flatApplied, allowances, total, lines };
}
