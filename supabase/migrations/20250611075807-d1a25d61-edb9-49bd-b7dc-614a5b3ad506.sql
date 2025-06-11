
-- Add pattern column to roster_config table to store shift patterns
ALTER TABLE public.roster_config 
ADD COLUMN pattern jsonb DEFAULT '[]'::jsonb;

-- Add comment to document the column
COMMENT ON COLUMN public.roster_config.pattern IS 'Array of shift codes representing the shift pattern (e.g. ["L", "L", "R", "E", "E"])';
