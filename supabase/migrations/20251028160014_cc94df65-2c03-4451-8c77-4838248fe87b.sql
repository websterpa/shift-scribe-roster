-- Align site_patterns schema to standardized multi-tenant model
-- 1. Add tenant_id column (nullable for now to preserve existing data)
ALTER TABLE public.site_patterns 
ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- 2. Rename repeat_weeks → cycle_length
ALTER TABLE public.site_patterns 
RENAME COLUMN repeat_weeks TO cycle_length;

-- 3. Rename crews_required → teams_required
ALTER TABLE public.site_patterns 
RENAME COLUMN crews_required TO teams_required;

-- 4. Seed five standardized 8-hour E/L/N/R patterns (idempotent)
INSERT INTO public.site_patterns (
  name, 
  description, 
  cycle_length, 
  sequence, 
  avg_weekly_hours, 
  teams_required, 
  system,
  is_wtd_compliant,
  created_by,
  site_id
)
SELECT 
  v.name,
  v.description,
  v.cycle_length,
  v.sequence::jsonb,
  v.avg_weekly_hours,
  v.teams_required,
  '8h'::text,
  true,
  '00000000-0000-0000-0000-000000000000'::uuid, -- system patterns
  'SYSTEM'::text
FROM (VALUES
  (
    '28-Day Continental',
    'Fast-forward rotation through all three shifts; equal E/L/N load across 4 weeks.',
    28,
    '["E","E","L","L","N","N","N","R","R","E","E","L","L","L","L","R","N","N","R","R","E","E","E","L","L","N","N","R","R"]',
    42,
    4
  ),
  (
    '8-Day 2-2-2-2',
    'Two E, two L, two N, two R; frequent rest, equal load.',
    8,
    '["E","E","L","L","N","N","R","R"]',
    42,
    4
  ),
  (
    '18-Day 4-On 2-Off',
    'Four same-shift + two rest; rotates E→L→N.',
    18,
    '["E","E","E","E","R","R","L","L","L","L","R","R","N","N","N","N","R","R"]',
    37,
    3
  ),
  (
    '24-Day 4-On 4-Off',
    'Four work + four rest; rotates E→L→N.',
    24,
    '["E","E","E","E","R","R","R","R","L","L","L","L","R","R","R","R","N","N","N","N","R","R","R","R"]',
    28,
    6
  ),
  (
    '28-Day Extended 6-2 / 7-4 / 7-2',
    'Mixed runs; balanced intensity and recovery.',
    28,
    '["E","E","E","E","E","E","R","R","L","L","L","L","L","L","L","R","R","R","R","N","N","N","N","N","N","N","R","R"]',
    40,
    4
  )
) AS v(name, description, cycle_length, sequence, avg_weekly_hours, teams_required)
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_patterns p WHERE p.name = v.name
);