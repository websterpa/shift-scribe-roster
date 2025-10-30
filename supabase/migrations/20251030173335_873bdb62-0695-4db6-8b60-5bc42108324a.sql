-- Migration: Enforce tenant isolation with NOT NULL constraints and enhanced RLS

-- Step 1: Set default tenant_id for existing rows (using demo tenant)
UPDATE public.roster_versions 
SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid 
WHERE tenant_id IS NULL;

UPDATE public.roster_assignments 
SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid 
WHERE tenant_id IS NULL;

UPDATE public.site_patterns 
SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid 
WHERE tenant_id IS NULL;

UPDATE public.correction_audit 
SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid 
WHERE tenant_id IS NULL;

-- Step 2: Make tenant_id NOT NULL
ALTER TABLE public.roster_versions 
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.roster_assignments 
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.site_patterns 
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.correction_audit 
  ALTER COLUMN tenant_id SET NOT NULL;

-- Step 3: Update RLS policies for site_patterns to include tenant isolation
DROP POLICY IF EXISTS "Users can view their own patterns" ON public.site_patterns;
DROP POLICY IF EXISTS "Users can create their own patterns" ON public.site_patterns;
DROP POLICY IF EXISTS "Users can delete their own patterns" ON public.site_patterns;

CREATE POLICY "Users can view their own patterns in their tenant" 
ON public.site_patterns 
FOR SELECT 
USING (
  created_by = auth.uid() 
  AND tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE POLICY "Users can create patterns in their tenant" 
ON public.site_patterns 
FOR INSERT 
WITH CHECK (
  created_by = auth.uid() 
  AND tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE POLICY "Users can delete their own patterns in their tenant" 
ON public.site_patterns 
FOR DELETE 
USING (
  created_by = auth.uid() 
  AND tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- Step 4: Update RLS policies for correction_audit to enforce tenant isolation
DROP POLICY IF EXISTS "Allow authenticated insert on correction_audit" ON public.correction_audit;
DROP POLICY IF EXISTS "Allow authenticated select on correction_audit" ON public.correction_audit;

CREATE POLICY "Users can insert audit logs in their tenant" 
ON public.correction_audit 
FOR INSERT 
WITH CHECK (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Users can view audit logs in their tenant" 
ON public.correction_audit 
FOR SELECT 
USING (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Step 5: Add indexes for tenant_id filtering performance
CREATE INDEX IF NOT EXISTS idx_roster_versions_tenant 
ON public.roster_versions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_roster_assignments_tenant 
ON public.roster_assignments(tenant_id);

CREATE INDEX IF NOT EXISTS idx_site_patterns_tenant 
ON public.site_patterns(tenant_id);

CREATE INDEX IF NOT EXISTS idx_correction_audit_tenant 
ON public.correction_audit(tenant_id);

-- Step 6: Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_roster_assignments_tenant_version 
ON public.roster_assignments(tenant_id, version_id);

CREATE INDEX IF NOT EXISTS idx_site_patterns_tenant_site 
ON public.site_patterns(tenant_id, site_id);

CREATE INDEX IF NOT EXISTS idx_correction_audit_tenant_version 
ON public.correction_audit(tenant_id, version_id);