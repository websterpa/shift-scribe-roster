-- Add cycle tracking for pattern rotation fairness
ALTER TABLE public.roster_config
ADD COLUMN IF NOT EXISTS cycle_index integer DEFAULT 0;

COMMENT ON COLUMN public.roster_config.cycle_index IS 'Tracks rotation cycle for fair pattern offset distribution. Increments with each generation to rotate unpopular shifts.';

CREATE INDEX IF NOT EXISTS idx_roster_config_cycle ON public.roster_config(cycle_index);