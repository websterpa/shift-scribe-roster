-- Add OT default configuration fields to roster_config table
ALTER TABLE public.roster_config 
ADD COLUMN default_ot_hours DECIMAL(4,2) DEFAULT NULL,
ADD COLUMN default_ot_start_local_time TEXT DEFAULT NULL;

-- Add comments to explain these fields
COMMENT ON COLUMN public.roster_config.default_ot_hours IS 'Default OT shift duration in hours (e.g., 4.0, 3.5). If NULL, falls back to system duration (8h or 12h)';
COMMENT ON COLUMN public.roster_config.default_ot_start_local_time IS 'Default OT start time in HH:mm format (e.g., "10:00"). If NULL, starts at site start time (T0)';