-- Seed verified shift patterns from legacy system
-- Using system UUID for created_by since these are built-in patterns

INSERT INTO public.site_patterns (name, system, sequence, cycle_length, avg_weekly_hours, teams_required, site_id, created_by, description)
VALUES 
  -- 8-hour patterns
  (
    '8-Day 2-2-2-2 (8h)',
    '8h',
    '["E","E","L","L","N","N","R","R"]'::jsonb,
    8,
    42,
    4,
    'SYSTEM',
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Two Early, two Late, two Night, two Rest – equal E/L/N load and frequent rest breaks.'
  ),
  (
    '18-Day 4-On 2-Off (8h)',
    '8h',
    '["E","E","E","E","R","R","L","L","L","L","R","R","N","N","N","N","R","R"]'::jsonb,
    18,
    37,
    3,
    'SYSTEM',
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Four consecutive shifts then two rest days; rotates through Early → Late → Night.'
  ),
  (
    '24-Day 4-On 4-Off (8h)',
    '8h',
    '["E","E","E","E","R","R","R","R","L","L","L","L","R","R","R","R","N","N","N","N","R","R","R","R"]'::jsonb,
    24,
    28,
    6,
    'SYSTEM',
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Four work days followed by four rest days; rotates through Early → Late → Night.'
  ),
  (
    '28-Day Continental (8h)',
    '8h',
    '["E","E","L","L","N","N","N","R","R","E","E","L","L","L","L","R","N","N","R","R","E","E","E","L","L","N","N","R","R"]'::jsonb,
    28,
    42,
    4,
    'SYSTEM',
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Fast-forward rotation through Early/Late/Night shifts over 4-week cycle.'
  )
ON CONFLICT (id) DO NOTHING;

-- Verify insertion
SELECT name, system, cycle_length, jsonb_array_length(sequence) as sequence_length 
FROM public.site_patterns 
WHERE site_id = 'SYSTEM'
ORDER BY cycle_length, name;