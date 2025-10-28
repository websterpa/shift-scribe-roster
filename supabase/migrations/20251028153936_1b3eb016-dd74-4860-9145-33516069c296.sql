-- Add WTD-compliant pattern metadata to site_patterns
ALTER TABLE public.site_patterns
ADD COLUMN IF NOT EXISTS avg_weekly_hours numeric DEFAULT 37.5,
ADD COLUMN IF NOT EXISTS crews_required integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS is_wtd_compliant boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS description text;

-- Add same fields to custom_patterns for consistency
ALTER TABLE public.custom_patterns
ADD COLUMN IF NOT EXISTS avg_weekly_hours numeric DEFAULT 37.5,
ADD COLUMN IF NOT EXISTS crews_required integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS is_wtd_compliant boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.site_patterns.avg_weekly_hours IS 'Average hours per week for this pattern';
COMMENT ON COLUMN public.site_patterns.crews_required IS 'Number of crews/teams required for continuous 24/7 coverage';
COMMENT ON COLUMN public.site_patterns.is_wtd_compliant IS 'Whether this pattern meets Working Time Directive requirements';
COMMENT ON COLUMN public.site_patterns.description IS 'Human-readable description of the pattern characteristics';

COMMENT ON COLUMN public.custom_patterns.avg_weekly_hours IS 'Average hours per week for this pattern';
COMMENT ON COLUMN public.custom_patterns.crews_required IS 'Number of crews/teams required for continuous 24/7 coverage';
COMMENT ON COLUMN public.custom_patterns.is_wtd_compliant IS 'Whether this pattern meets Working Time Directive requirements';
COMMENT ON COLUMN public.custom_patterns.description IS 'Human-readable description of the pattern characteristics';