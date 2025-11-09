import { z } from "zod";

export const ShiftSystem = z.enum(["8h","12h"]);
export const ShiftToken = z.enum(["D","E","L","N","R","S"]); // DB CHECK

export const RosterBuilderInput = z.object({
  siteId: z.string().uuid().optional(),
  tz: z.string().default("Europe/London"),
  siteStartHour: z.number().int().min(0).max(23).default(6),           // from roster_config.site_start_time
  system: ShiftSystem,                                      // 8h => E/L/N; 12h => D/N
  horizonWeeks: z.number().int().min(1).max(17).default(17),
  pattern: z.string().min(1),                               // token string like "DDNNRRRR" or "ELNR..."
  patternMode: z.enum(['locked', 'guided']).default('locked'), // Pattern adherence mode
  cycleAnchorDate: z.date().optional(),                     // Reference date for pattern cycle (defaults to start_date)
  staffing: z.array(z.object({                              // per weekday
    dow: z.number().int().min(0).max(6),
    need: z.record(ShiftToken, z.number().int().min(0).default(0))
  })).length(7),
  rates: z.object({
    staff: z.number().min(0).default(18),
    supervisor: z.number().min(0).default(24),
    roleMixByShift: z.record(ShiftToken, z.number().min(0).max(100)).default({ D:0,E:0,L:0,N:0,R:0,S:0 }),
    budgetWarn: z.number().min(0).nullable().default(null)
  }),
  allowSupervisorNights: z.boolean().default(false),        // site_settings flag
});

export type RosterBuilderInput = z.infer<typeof RosterBuilderInput>;

// Default staffing configurations
export const DEFAULT_STAFFING_8H = [
  { dow: 0, need: { E: 2, L: 2, N: 1, D: 0, R: 0, S: 0 } }, // Sunday
  { dow: 1, need: { E: 3, L: 3, N: 1, D: 0, R: 0, S: 0 } }, // Monday
  { dow: 2, need: { E: 3, L: 3, N: 1, D: 0, R: 0, S: 0 } }, // Tuesday
  { dow: 3, need: { E: 3, L: 3, N: 1, D: 0, R: 0, S: 0 } }, // Wednesday
  { dow: 4, need: { E: 3, L: 3, N: 1, D: 0, R: 0, S: 0 } }, // Thursday
  { dow: 5, need: { E: 3, L: 3, N: 1, D: 0, R: 0, S: 0 } }, // Friday
  { dow: 6, need: { E: 2, L: 2, N: 1, D: 0, R: 0, S: 0 } }, // Saturday
];

export const DEFAULT_STAFFING_12H = [
  { dow: 0, need: { D: 3, N: 1, E: 0, L: 0, R: 0, S: 0 } }, // Sunday
  { dow: 1, need: { D: 4, N: 1, E: 0, L: 0, R: 0, S: 0 } }, // Monday
  { dow: 2, need: { D: 4, N: 1, E: 0, L: 0, R: 0, S: 0 } }, // Tuesday
  { dow: 3, need: { D: 4, N: 1, E: 0, L: 0, R: 0, S: 0 } }, // Wednesday
  { dow: 4, need: { D: 4, N: 1, E: 0, L: 0, R: 0, S: 0 } }, // Thursday
  { dow: 5, need: { D: 4, N: 1, E: 0, L: 0, R: 0, S: 0 } }, // Friday
  { dow: 6, need: { D: 3, N: 1, E: 0, L: 0, R: 0, S: 0 } }, // Saturday
];

// Pattern presets
export const PATTERN_PRESETS_8H = [
  { name: "2E–2L–2N–4R", pattern: "EELLNNRRRR" },
  { name: "4 on 4 off (E/L mix)", pattern: "EEERRRR" },
  { name: "Nights-leaning", pattern: "ELNNRRR" },
];

export const PATTERN_PRESETS_12H = [
  { name: "4D–4R–4N–4R", pattern: "DDDDRRRRNNNNRRRR" },
  { name: "Days-only 4 on 4 off", pattern: "DDDDRRRR" },
  { name: "2D–2N–4R", pattern: "DDNNRRRR" },
];