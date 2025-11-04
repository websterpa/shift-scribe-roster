-- Allow all authenticated users to view all patterns in the feasibility calculator
-- This is safe because patterns are read-only reference data for calculations

DROP POLICY IF EXISTS "Users can view their own patterns in their tenant" ON site_patterns;

CREATE POLICY "Users can view all patterns for calculations"
ON site_patterns
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Keep existing insert/update/delete policies restricted to pattern creators