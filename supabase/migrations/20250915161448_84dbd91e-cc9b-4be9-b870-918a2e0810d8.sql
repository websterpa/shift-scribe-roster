-- Add site timing configuration fields to roster_config table
ALTER TABLE public.roster_config 
ADD COLUMN site_start_time TEXT DEFAULT '07:00',
ADD COLUMN timezone TEXT DEFAULT 'Europe/London';

-- Add a comment to explain these fields
COMMENT ON COLUMN public.roster_config.site_start_time IS 'Local roster start time in HH:mm format (e.g., "06:00", "07:30")';
COMMENT ON COLUMN public.roster_config.timezone IS 'IANA timezone for the site (e.g., "Europe/London", "America/New_York")';