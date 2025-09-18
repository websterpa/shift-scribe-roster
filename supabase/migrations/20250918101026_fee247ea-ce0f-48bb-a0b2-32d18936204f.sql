-- Table for persisted patterns
CREATE TABLE IF NOT EXISTS site_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  created_by UUID NOT NULL,             -- auth user id
  name TEXT NOT NULL,
  system TEXT NOT NULL CHECK (system IN ('8h','12h')),
  sequence JSONB NOT NULL,              -- ["D","D","N","N","R","R","R","R"]
  repeat_weeks INT NOT NULL DEFAULT 17,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Useful index
CREATE INDEX IF NOT EXISTS idx_site_patterns_site ON site_patterns(site_id);

-- RLS
ALTER TABLE site_patterns ENABLE ROW LEVEL SECURITY;

-- Policies: users can read/write their own patterns
CREATE POLICY "Users can view their own patterns"
  ON site_patterns FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can create their own patterns"
  ON site_patterns FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own patterns"
  ON site_patterns FOR DELETE
  USING (created_by = auth.uid());