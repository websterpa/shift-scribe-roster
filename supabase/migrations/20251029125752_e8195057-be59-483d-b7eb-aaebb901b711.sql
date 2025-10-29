-- Update table and column comments to reflect "Shift Patterns" terminology
-- Note: These are metadata changes only, no schema structure is altered

-- Table description
COMMENT ON TABLE public.site_patterns IS
'Shift Patterns: predefined rotational templates (E/L/N/R or D/N) for use in roster generation. Table name is "site_patterns" for legacy reasons.';

-- Column descriptions
COMMENT ON COLUMN public.site_patterns.name IS
'Shift Pattern name (e.g., "8-Day 2-2-2-2", "Continental 12h")';

COMMENT ON COLUMN public.site_patterns.description IS
'Explanation of how the shift pattern works and its characteristics';

COMMENT ON COLUMN public.site_patterns.sequence IS
'Ordered list of shift codes forming the repeating pattern (e.g., ["D","D","N","N","R","R","R","R"])';

COMMENT ON COLUMN public.site_patterns.cycle_length IS
'Number of days before the shift pattern repeats (derived from sequence length)';

COMMENT ON COLUMN public.site_patterns.avg_weekly_hours IS
'Approximate average weekly hours for this shift pattern';

COMMENT ON COLUMN public.site_patterns.teams_required IS
'Typical number of teams required for 24/7 coverage using this shift pattern';

COMMENT ON COLUMN public.site_patterns.system IS
'Shift system type: "8h" (Early/Late/Night) or "12h" (Day/Night)';

COMMENT ON COLUMN public.site_patterns.is_wtd_compliant IS
'Whether this shift pattern complies with Working Time Directive regulations';

COMMENT ON COLUMN public.site_patterns.site_id IS
'Identifier for the site/location where this shift pattern is used';

COMMENT ON COLUMN public.site_patterns.tenant_id IS
'Tenant identifier for multi-tenancy support';

COMMENT ON COLUMN public.site_patterns.created_by IS
'User ID of the person who created this shift pattern';

COMMENT ON COLUMN public.site_patterns.created_at IS
'Timestamp when this shift pattern was created';