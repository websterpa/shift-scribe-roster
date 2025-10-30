-- Create correction_audit table for persistent tracking of automatic corrections
CREATE TABLE public.correction_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid REFERENCES public.roster_versions(id) ON DELETE CASCADE NOT NULL,
  staff_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  shift_date date NOT NULL,
  old_shift text NOT NULL,
  new_shift text NOT NULL,
  reason text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  applied_at timestamp with time zone DEFAULT now() NOT NULL,
  tenant_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.correction_audit ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert audit entries
CREATE POLICY "Allow authenticated insert on correction_audit"
ON public.correction_audit
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to view audit entries
CREATE POLICY "Allow authenticated select on correction_audit"
ON public.correction_audit
FOR SELECT
TO authenticated
USING (true);

-- Create index for faster queries by version and date
CREATE INDEX idx_correction_audit_version_date 
ON public.correction_audit(version_id, shift_date);

-- Create index for staff lookups
CREATE INDEX idx_correction_audit_staff 
ON public.correction_audit(staff_id);