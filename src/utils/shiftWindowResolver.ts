import { DateTime, Duration } from "luxon";
import { ShiftCode, ShiftSystem, ensureShiftSystemConsistency } from "./constraints";

export interface ShiftTimingConfig {
  /** "8h" => (E,L,N)  |  "12h" => (D,N) */
  shiftSystem: ShiftSystem;
  /** Local roster start time as "HH:mm" (e.g., "06:00", "07:30"). */
  siteStartLocalTime: string;
  /** IANA timezone for the site, e.g., "Europe/London". */
  timezone: string;
}

export interface ShiftWindow {
  start: Date; // JS Date in absolute time
  end: Date;   // JS Date in absolute time
}

/**
 * Build a resolver function that returns the absolute start/end Date of a shift code
 * on a given local calendar day (dateISO = "YYYY-MM-DD") in the site's timezone.
 *
 * Rules:
 * - 8h system: E starts at T0, L at T0+8h, N at T0+16h (ends next day T0+24h)
 * - 12h system: D starts at T0, N starts at T0+12h (ends next day T0+24h)
 * - Handles DST correctly via Luxon.
 * - Validates that codes are consistent with the declared shiftSystem.
 */
export function makeShiftWindowResolver(config: ShiftTimingConfig) {
  const { shiftSystem, siteStartLocalTime, timezone } = config;

  // Parse HH:mm safely
  const [hhStr, mmStr] = siteStartLocalTime.split(":");
  const baseHour = Number(hhStr);
  const baseMinute = Number(mmStr ?? "0");
  if (
    !Number.isFinite(baseHour) ||
    !Number.isFinite(baseMinute) ||
    baseHour < 0 || baseHour > 23 ||
    baseMinute < 0 || baseMinute > 59
  ) {
    throw new Error(`Invalid siteStartLocalTime "${siteStartLocalTime}" — expected "HH:mm" 00:00–23:59`);
  }

  // Shift offsets (hours from T0) by system
  const offsets8h: Record<"E" | "L" | "N", number> = { E: 0, L: 8, N: 16 };
  const offsets12h: Record<"D" | "N", number> = { D: 0, N: 12 };

  return function resolve(dateISO: string, code: ShiftCode): ShiftWindow | null {
    // Allow rest/leave codes to return null (no window)
    if (!["E","L","N","D","OT"].includes(code)) return null;

    if (!ensureShiftSystemConsistency(code, shiftSystem)) {
      throw new Error(`Shift code "${code}" not allowed in system "${shiftSystem}"`);
    }

    // Base T0 at local siteStart on dateISO
    const T0 = DateTime.fromISO(`${dateISO}T${pad2(baseHour)}:${pad2(baseMinute)}`, { zone: timezone });
    if (!T0.isValid) {
      throw new Error(`Invalid date/time for site timezone: ${dateISO} @ ${siteStartLocalTime} (${timezone})`);
    }

    // Compute start and end using Luxon durations (DST-safe)
    let start: DateTime;
    let end: DateTime;

    if (shiftSystem === "8h") {
      const code8 = code as "E" | "L" | "N" | "OT"; // OT uses same duration logic as a worked shift; duration depends on system
      const startOffsetHrs =
        code8 === "OT"
          ? 0 // For OT we assume manager sets explicit start elsewhere; here we default to E's slot to get a duration
          : offsets8h[code8 as "E" | "L" | "N"];
      start = T0.plus(Duration.fromObject({ hours: startOffsetHrs }));
      // 8h duration for E/L/N/OT within 8h system
      end = start.plus(Duration.fromObject({ hours: 8 }));

    } else {
      // 12h system
      const code12 = code as "D" | "N" | "OT";
      const startOffsetHrs =
        code12 === "OT"
          ? 0
          : offsets12h[code12 as "D" | "N"];
      start = T0.plus(Duration.fromObject({ hours: startOffsetHrs }));
      // 12h duration for D/N/OT within 12h system
      end = start.plus(Duration.fromObject({ hours: 12 }));
    }

    return { start: start.toJSDate(), end: end.toJSDate() };
  };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}