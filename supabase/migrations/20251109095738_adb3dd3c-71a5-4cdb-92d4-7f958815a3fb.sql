-- Add team_index to staff_profiles for deterministic pattern positioning
ALTER TABLE public.staff_profiles 
ADD COLUMN IF NOT EXISTS team_index INTEGER NULL;

COMMENT ON COLUMN public.staff_profiles.team_index IS 
'Team/offset index for deterministic pattern positioning (0-based). Auto-assigned during generation if NULL.';

-- Add cycle_anchor_date to roster_config for pattern cycle reference
ALTER TABLE public.roster_config 
ADD COLUMN IF NOT EXISTS cycle_anchor_date DATE NULL;

COMMENT ON COLUMN public.roster_config.cycle_anchor_date IS 
'Reference date for pattern cycle calculations. Defaults to first day of generated period if NULL.';