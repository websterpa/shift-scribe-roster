-- Add tenant_id to roster_versions for multi-tenancy
ALTER TABLE public.roster_versions 
ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Add tenant_id to roster_assignments for multi-tenancy
ALTER TABLE public.roster_assignments 
ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Add label field to roster_versions
ALTER TABLE public.roster_versions 
ADD COLUMN IF NOT EXISTS label text;

-- Create index for tenant-based queries
CREATE INDEX IF NOT EXISTS idx_roster_versions_tenant 
ON public.roster_versions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_roster_assignments_tenant 
ON public.roster_assignments(tenant_id);

-- Update RLS policies for tenant isolation on roster_versions
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.roster_versions;

CREATE POLICY "Tenant isolation for roster_versions" 
ON public.roster_versions 
FOR ALL 
TO authenticated
USING (tenant_id::text = (SELECT tenant_id FROM staff_profiles WHERE user_id = auth.uid() LIMIT 1)::text);

-- Update RLS policies for tenant isolation on roster_assignments
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.roster_assignments;

CREATE POLICY "Tenant isolation for roster_assignments" 
ON public.roster_assignments 
FOR ALL 
TO authenticated
USING (tenant_id::text = (SELECT tenant_id FROM staff_profiles WHERE user_id = auth.uid() LIMIT 1)::text);