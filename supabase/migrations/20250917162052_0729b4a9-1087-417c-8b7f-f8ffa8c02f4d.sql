-- Add budget warning threshold column to site_settings table
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS budget_warn_threshold numeric DEFAULT 500;

-- Set default threshold for existing rows
UPDATE site_settings 
SET budget_warn_threshold = 500 
WHERE budget_warn_threshold IS NULL;