export const SUMMARY_CFG = {
  // tables used for fallbacks; adapt to your schema
  versions: "roster_versions",           // id (uuid), config_id, version_number, version_name, generated_at
  requirements: "roster_requirements",   // version_id (uuid), day_idx (int 0-6), shift (text 'D'/'N'/'E'/'L'), required (int)
  assignments: "roster_assignments",     // version_id (uuid), day_idx, shift, staff_id (uuid)
  siteSettings: "site_settings",         // site_id (uuid), budget (numeric)
  ratesView: "vw_rates_for_estimate",    // optional view: site_id, staff_rate, supervisor_rate, mix_by_shift (json)
};