-- Create archived_rosters table for audit trail
CREATE TABLE IF NOT EXISTS public.archived_rosters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT,
  month TEXT NOT NULL,
  assignments JSONB NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT now(),
  archived_by UUID,
  reason TEXT DEFAULT 'Regeneration',
  version_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on archived_rosters
ALTER TABLE public.archived_rosters ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view archived rosters
CREATE POLICY "Allow authenticated users to view archived rosters"
ON public.archived_rosters
FOR SELECT
USING (true);

-- Allow authenticated users to insert archived rosters
CREATE POLICY "Allow authenticated users to insert archived rosters"
ON public.archived_rosters
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_archived_rosters_month ON public.archived_rosters(month);
CREATE INDEX IF NOT EXISTS idx_archived_rosters_tenant ON public.archived_rosters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_archived_rosters_archived_at ON public.archived_rosters(archived_at DESC);