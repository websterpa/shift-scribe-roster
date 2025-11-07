-- Add pattern adherence mode to roster_config
ALTER TABLE public.roster_config
ADD COLUMN pattern_adherence_mode TEXT NOT NULL DEFAULT 'locked';

-- Add check constraint for valid values
ALTER TABLE public.roster_config
ADD CONSTRAINT roster_config_pattern_adherence_mode_check 
CHECK (pattern_adherence_mode IN ('locked', 'guided'));

-- Add comment
COMMENT ON COLUMN public.roster_config.pattern_adherence_mode IS 
'Pattern adherence mode: locked (strict pattern following, no fairness reshuffles) or guided (allow fairness fills and corrections)';
