-- Ensure pattern_id in staff_profiles is nullable and has proper index
-- This allows staff to exist without patterns and prevents FK violations

-- Make pattern_id nullable (idempotent - won't fail if already nullable)
DO $$ 
BEGIN
  ALTER TABLE public.staff_profiles 
  ALTER COLUMN pattern_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN 
    NULL; -- Ignore error if constraint doesn't exist
END $$;

-- Add an index on pattern_id for better query performance
CREATE INDEX IF NOT EXISTS idx_staff_profiles_pattern_id 
ON public.staff_profiles(pattern_id) 
WHERE pattern_id IS NOT NULL;

-- Add a comment explaining the pattern_id column
COMMENT ON COLUMN public.staff_profiles.pattern_id IS 'References either custom_patterns.id or site_patterns.id depending on context. Nullable to allow staff without assigned patterns.';