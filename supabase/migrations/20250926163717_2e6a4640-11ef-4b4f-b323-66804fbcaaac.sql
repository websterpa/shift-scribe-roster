-- 0.1 Add site-level flag for supervisor nights (default false)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS allow_supervisor_nights boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.site_settings.allow_supervisor_nights IS
'If true, supervisors are eligible for Night shifts in generation. If false, supervisors excluded from N.';

-- 0.2 Compatibility view for Legacy Create patterns (site-scoped)
-- Adapted to existing schema: site_patterns(sequence jsonb, name text, site_id text, created_at)
-- tokens derived from sequence (array of tokens or string)
CREATE OR REPLACE VIEW public.patterns_legacy AS
SELECT
  p.id,
  p.site_id,
  p.name,
  CASE
    WHEN jsonb_typeof(p.sequence) = 'array' THEN (
      SELECT string_agg(val, '' ORDER BY ord)
      FROM jsonb_array_elements_text(p.sequence) WITH ORDINALITY AS t(val, ord)
    )
    WHEN jsonb_typeof(p.sequence) = 'string' THEN trim(both '"' from p.sequence::text)
    ELSE NULL
  END AS tokens,
  NULL::text AS description,
  p.created_at
FROM public.site_patterns p;