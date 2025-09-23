-- Returns counts per token for a roster version 
CREATE OR REPLACE FUNCTION rpc_version_token_counts(version_id uuid)
RETURNS TABLE(token text, cnt int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN shift_code = 'Day' THEN 'D'
      WHEN shift_code = 'Early' THEN 'E' 
      WHEN shift_code = 'Late' THEN 'L'
      WHEN shift_code = 'Night' THEN 'N'
      WHEN shift_code = 'Rest' THEN 'R'
      WHEN shift_code = 'Sick' THEN 'S'
      ELSE UPPER(LEFT(shift_code, 1))
    END as token,
    COUNT(*)::int as cnt
  FROM roster_assignments
  WHERE version_id = rpc_version_token_counts.version_id
  GROUP BY 
    CASE 
      WHEN shift_code = 'Day' THEN 'D'
      WHEN shift_code = 'Early' THEN 'E' 
      WHEN shift_code = 'Late' THEN 'L'
      WHEN shift_code = 'Night' THEN 'N'
      WHEN shift_code = 'Rest' THEN 'R'
      WHEN shift_code = 'Sick' THEN 'S'
      ELSE UPPER(LEFT(shift_code, 1))
    END
  ORDER BY token;
$$;