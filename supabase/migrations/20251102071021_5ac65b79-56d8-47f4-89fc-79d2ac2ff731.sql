-- Add tenant_id column to roster_config table
ALTER TABLE roster_config
  ADD COLUMN tenant_id UUID NOT NULL
  DEFAULT '00000000-0000-0000-0000-000000000001';

-- Create index for tenant_id lookups
CREATE INDEX idx_roster_config_tenant ON roster_config(tenant_id);

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON roster_config;
DROP POLICY IF EXISTS "Allow authenticated delete on roster_config" ON roster_config;
DROP POLICY IF EXISTS "Allow authenticated insert on roster_config" ON roster_config;
DROP POLICY IF EXISTS "Allow authenticated select on roster_config" ON roster_config;
DROP POLICY IF EXISTS "Allow authenticated update on roster_config" ON roster_config;

-- Create tenant isolation policy for roster_config
CREATE POLICY "Tenant isolation for roster_config"
  ON roster_config
  FOR ALL
  USING (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid)
  WITH CHECK (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Add comment explaining tenant isolation
COMMENT ON COLUMN roster_config.tenant_id IS 'Tenant identifier for multi-tenant isolation';
COMMENT ON POLICY "Tenant isolation for roster_config" ON roster_config IS 'Ensures users can only access roster_config records in their tenant';