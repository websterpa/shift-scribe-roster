
-- Add unique constraint for roster assignment identity
-- One staff can only have one assignment per date per roster version
CREATE UNIQUE INDEX IF NOT EXISTS idx_roster_assignments_unique
ON public.roster_assignments(version_id, date, staff_id);

-- Add comment for documentation
COMMENT ON INDEX idx_roster_assignments_unique IS 'Ensures one assignment per staff per date per roster version';
