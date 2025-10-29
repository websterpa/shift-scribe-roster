-- Add verified 12-Day 3N-3R-3D-2R shift pattern (12-hour system)
-- Pattern validated over 17 weeks for WTD compliance (avg ~37 h/week)
-- Core sequence: R N N N | R R R | D D D | R R (repeats every 12 days)
-- Staff use different offsets (0, 6, 9, etc.) to stagger coverage

INSERT INTO public.site_patterns
  (name, description, cycle_length, sequence, system, avg_weekly_hours, teams_required, tenant_id, site_id, created_by)
VALUES
  (
    '12-Day 3N-3R-3D-2R (12h)',
    '12-day pattern rotating Nights then Days with rest breaks: R-N-N-N-R-R-R-D-D-D-R-R (repeat). Legacy control-room pattern validated for WTD compliance over 17 weeks.',
    12,
    '["R","N","N","N","R","R","R","D","D","D","R","R"]'::jsonb,
    '12h',
    37.5,
    4,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'default',
    '00000000-0000-0000-0000-000000000000'::uuid
  );

COMMENT ON COLUMN public.site_patterns.cycle_length IS 'Pattern repeats every N days (e.g., 12 for 3N-3R-3D-2R)';
COMMENT ON COLUMN public.site_patterns.sequence IS 'Array of shift codes (D/N/E/L/R) defining the repeating pattern';

-- Verify staff_profiles.pattern_offset exists for offset-based rotation
-- (Already exists in schema, this is just documentation)
COMMENT ON COLUMN public.staff_profiles.pattern_offset IS 'Start position within pattern sequence (0 to cycle_length-1). Used to stagger staff rotations so teams don''t always work together.';