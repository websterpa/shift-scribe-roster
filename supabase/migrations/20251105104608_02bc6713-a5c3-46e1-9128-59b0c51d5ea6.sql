-- Add site-level standard contract hours to roster_config
ALTER TABLE public.roster_config
  ADD COLUMN standard_contract_hours NUMERIC(5,2) NOT NULL DEFAULT 37.5;

COMMENT ON COLUMN public.roster_config.standard_contract_hours IS 'Standard weekly contract hours for all staff (site-level setting)';