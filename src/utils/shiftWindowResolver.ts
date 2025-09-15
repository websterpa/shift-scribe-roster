import { DateTime, Duration } from "luxon";
import { ShiftCode, ShiftSystem, ensureShiftSystemConsistency } from "./constraints";

export interface OTOptions {
  /** Length of the OT shift in hours (can be fractional, e.g., 4 or 3.5). */
  otHours?: number;
  /**
   * Custom local start time for this OT shift ("HH:mm"). If omitted,
   * OT starts at the system's Day/Early slot (T0) by default.
   */
  otStartLocalTime?: string;
}

/** Add to ShiftTimingConfig if you want site defaults (optional) */
export interface ShiftTimingConfig {
  /** "8h" => (E,L,N)  |  "12h" => (D,N) */
  shiftSystem: ShiftSystem;
  /** Local roster start time as "HH:mm" (e.g., "06:00", "07:30"). */
  siteStartLocalTime: string;
  /** IANA timezone for the site, e.g., "Europe/London". */
  timezone: string;
  /** Default OT hours if not passed per assignment. Optional. */
  defaultOtHours?: number; // e.g., 4 for common top-ups
  /** Default OT start local time if not passed per assignment. Optional. */
  defaultOtStartLocalTime?: string; // e.g., "10:00"
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
 * - OT: Variable hours and start time based on otOpts or config defaults
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

  return function resolve(dateISO: string, code: ShiftCode, otOpts?: OTOptions): ShiftWindow | null {
    // Non-work codes
    if (!["E","L","N","D","OT"].includes(code)) return null;

    if (!ensureShiftSystemConsistency(code, shiftSystem)) {
      throw new Error(`Shift code "${code}" not allowed in system "${shiftSystem}"`);
    }

    // Compute T0 from siteStartLocalTime
    const T0 = DateTime.fromISO(`${dateISO}T${pad2(baseHour)}:${pad2(baseMinute)}`, { zone: timezone });
    if (!T0.isValid) {
      throw new Error(`Invalid date/time for site timezone: ${dateISO} @ ${siteStartLocalTime} (${timezone})`);
    }

    let start: DateTime;
    let end: DateTime;

    if (code === "OT") {
      // --- Variable OT handling ---
      const otHours =
        (otOpts?.otHours ?? config.defaultOtHours) ??
        (shiftSystem === "8h" ? 8 : 12); // fallback to system duration

      if (!Number.isFinite(otHours) || otHours <= 0) {
        throw new Error(`Invalid otHours "${otOpts?.otHours}" — must be > 0`);
      }

      let otStart: DateTime = T0;
      const otStartStr = otOpts?.otStartLocalTime ?? config.defaultOtStartLocalTime;
      if (otStartStr) {
        const [oh, om = "0"] = otStartStr.split(":");
        const oH = Number(oh), oM = Number(om);
        if (
          Number.isFinite(oH) && Number.isFinite(oM) &&
          oH >= 0 && oH <= 23 && oM >= 0 && oM <= 59
        ) {
          const customOtStart = DateTime.fromISO(`${dateISO}T${pad2(oH)}:${pad2(oM)}`, { zone: timezone });
          if (!customOtStart.isValid) {
            throw new Error(`Invalid otStartLocalTime "${otStartStr}" for ${dateISO} in ${timezone}`);
          }
          otStart = customOtStart;
        } else {
          throw new Error(`Invalid otStartLocalTime "${otStartStr}" — expected "HH:mm"`);
        }
      }

      start = otStart;
      end = start.plus(Duration.fromObject({ hours: otHours }));

    } else if (shiftSystem === "8h") {
      const offsets8h: Record<"E" | "L" | "N", number> = { E: 0, L: 8, N: 16 };
      const startOffsetHrs = offsets8h[code as "E" | "L" | "N"];
      start = T0.plus(Duration.fromObject({ hours: startOffsetHrs }));
      end = start.plus(Duration.fromObject({ hours: 8 }));

    } else {
      // 12h system
      const offsets12h: Record<"D" | "N", number> = { D: 0, N: 12 };
      const startOffsetHrs = offsets12h[code as "D" | "N"];
      start = T0.plus(Duration.fromObject({ hours: startOffsetHrs }));
      end = start.plus(Duration.fromObject({ hours: 12 }));
    }

    return { start: start.toJSDate(), end: end.toJSDate() };
  };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}