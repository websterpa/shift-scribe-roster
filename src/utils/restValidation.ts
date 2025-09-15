import { ShiftCode, isWorkCode } from "./constraints";

export interface ShiftWindow { start: Date; end: Date; }

// Inject an adapter so we re-use your canonical shift timing logic.
export type ShiftWindowResolver = (dateISO: string, code: ShiftCode) => ShiftWindow | null;

export function has11hRest(prevEnd: Date | null, nextStart: Date | null): boolean {
  if (!prevEnd || !nextStart) return true;
  const hours = (nextStart.getTime() - prevEnd.getTime()) / 3_600_000;
  return hours >= 11;
}

// Same-calendar-day Day→Night ban (covers D→N and E/L→N on same date)
export function violatesSameDayDayToNight(
  prevDateISO: string | null, prevCode: ShiftCode | null,
  nextDateISO: string, nextCode: ShiftCode
) {
  if (!prevDateISO || !prevCode) return false;
  if (nextCode !== "N") return false;
  if (!isWorkCode(prevCode)) return false;
  return prevDateISO === nextDateISO; // any worked day shift → same-day night is banned
}

// Decide if a proposed assignment is allowed by rest rules.
export function respectsRestRules(
  prevEnd: Date | null,
  prevDateISO: string | null,
  prevCode: ShiftCode | null,
  nextDateISO: string,
  nextCode: ShiftCode,
  resolve: ShiftWindowResolver
): boolean {
  if (!isWorkCode(nextCode)) return true;
  if (violatesSameDayDayToNight(prevDateISO, prevCode, nextDateISO, nextCode)) return false;

  const nextWin = resolve(nextDateISO, nextCode);
  if (!nextWin) return true;

  return has11hRest(prevEnd, nextWin.start);
}