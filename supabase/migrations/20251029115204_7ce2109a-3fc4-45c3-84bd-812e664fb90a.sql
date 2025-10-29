-- Add required_shifts column to roster_config table
ALTER TABLE roster_config 
ADD COLUMN IF NOT EXISTS required_shifts text[] DEFAULT ARRAY['E','L','N'];

-- Update existing records to set required_shifts based on shift_type
UPDATE roster_config 
SET required_shifts = 
  CASE 
    WHEN shift_type = '12h' THEN ARRAY['D','N']
    ELSE ARRAY['E','L','N']
  END
WHERE required_shifts IS NULL OR required_shifts = ARRAY['E','L','N'];

-- Add comment for documentation
COMMENT ON COLUMN roster_config.required_shifts IS 'Array of valid shift codes for this configuration (e.g., [E,L,N] for 8h or [D,N] for 12h)';