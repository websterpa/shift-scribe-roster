-- Seed standard 12-hour D/N patterns for the feasibility calculator
-- These patterns are explicitly marked as 12h system

INSERT INTO public.site_patterns (
  name, 
  description, 
  cycle_length, 
  sequence, 
  avg_weekly_hours, 
  teams_required, 
  system, 
  tenant_id, 
  site_id, 
  created_by,
  is_wtd_compliant
)
VALUES
  (
    '14-Day 2D-2N-2R (12h)', 
    '2 days, 2 nights, 2 rest repeating (12-hour shifts)', 
    14,
    '["D","D","N","N","R","R","D","D","N","N","R","R","R","R"]'::jsonb,
    42, 
    4, 
    '12h',
    '00000000-0000-0000-0000-000000000001'::uuid,
    'default',
    '00000000-0000-0000-0000-000000000000'::uuid,
    true
  ),
  (
    '28-Day 4-On 4-Off (12h)', 
    'Four 12h shifts then four rest, rotating D→N', 
    28,
    '["D","D","D","D","R","R","R","R","N","N","N","N","R","R","R","R","D","D","D","D","R","R","R","R","N","N","N","N"]'::jsonb,
    42, 
    4, 
    '12h',
    '00000000-0000-0000-0000-000000000001'::uuid,
    'default',
    '00000000-0000-0000-0000-000000000000'::uuid,
    true
  ),
  (
    '21-Day 3D-3N-3R (12h)', 
    '3 days, 3 nights, 3 rest (12-hour shifts)', 
    21,
    '["D","D","D","N","N","N","R","R","R","D","D","D","N","N","N","R","R","R","R","R","R"]'::jsonb,
    42, 
    4, 
    '12h',
    '00000000-0000-0000-0000-000000000001'::uuid,
    'default',
    '00000000-0000-0000-0000-000000000000'::uuid,
    true
  ),
  (
    '10-Day 2D-2N-1R (12h)', 
    '2 days, 2 nights, 1 rest - compact rotation (12-hour shifts)', 
    10,
    '["D","D","N","N","R","D","D","N","N","R"]'::jsonb,
    48, 
    5, 
    '12h',
    '00000000-0000-0000-0000-000000000001'::uuid,
    'default',
    '00000000-0000-0000-0000-000000000000'::uuid,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Backfill any NULL system values based on sequence content
-- If sequence contains 'D' (and not 'E' or 'L'), mark as 12h; otherwise 8h
UPDATE public.site_patterns
SET system = CASE
  WHEN system IS NULL THEN
    CASE
      WHEN EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(sequence) s WHERE s = 'D'
      ) AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(sequence) s WHERE s IN ('E','L')
      ) THEN '12h'
      ELSE '8h'
    END
  ELSE system
END
WHERE system IS NULL OR system NOT IN ('8h', '12h');