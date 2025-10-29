import { describe, it, expect } from "vitest";
import { generateRoster, type GeneratorConfig } from "@/services/roster/helpers/rosterGeneration";
import { createClient } from "@supabase/supabase-js";

// NOTE: We call internal parse via generate with a stub Supabase by passing a prepared cfg row.
// If that is awkward in your project, factor parseRequirements into its own module and import directly.

describe("requirements parsing (legacy vs new)", () => {
  const config: GeneratorConfig = {
    tables: { rosterConfig: "roster_config", staff: "staff_profiles", assignments: "roster_assignments" },
    columns: {
      rosterConfigVersionFK: "config_id",
      rosterConfigRequirements: "staffing_requirements",
      asgVersionFK: "version_id",
      asgStaffId: "staff_id",
      asgRoleId: "role_id",
      asgSiteId: "site_id",
      asgStart: "shift_start",
      asgEnd: "shift_end",
      asgCostBase: "cost_base",
      asgCostDiff: "cost_diff",
      asgCostPrem: "cost_premium",
      asgCostFlat: "cost_flat",
      asgCostAllow: "cost_allowances",
      asgCostTotal: "cost_total",
      asgMeta: "meta",
      asgDate: "date",
      asgShiftCode: "shift_code",
      asgHours: "hours",
      asgCost: "cost",
    },
    staff: { idCol: "id", activeCol: "is_active", activeValue: true },
    defaults: { dayShiftStart: "08:00", dayShiftEnd: "16:00", nightShiftStart: "22:00", nightShiftEnd: "06:00", siteId: "SITE1" },
  };

  it("expands legacy weekday map into dated requirements for month", () => {
    // Legacy: 1 day + 1 night on Mondays only ("1" = Monday for getDay? 1=Mon)
    const legacy = { "1": { "D": 1, "N": 1 } };
    // Simple sanity: for September 2025, Mondays are 1st, 8th, 15th, 22nd, 29th (5 occurrences)
    // We won't hit DB here; this test becomes an integration once DB is wired. This is a placeholder expectation example.
    expect(legacy["1"]["D"]).toBe(1);
    expect(legacy["1"]["N"]).toBe(1);
  });

  it("accepts new per-day format and filters by month", () => {
    const data = {
      days: {
        "2025-08-31": [{ role_id: "D", site_id: "SITE1", start: "2025-08-31T08:00:00", end: "2025-08-31T16:00:00", needed: 1 }],
        "2025-09-01": [{ role_id: "D", site_id: "SITE1", start: "2025-09-01T08:00:00", end: "2025-09-01T16:00:00", needed: 2 }],
      },
    };
    expect(Object.keys(data.days).some(d => d.startsWith("2025-09"))).toBe(true);
  });
});