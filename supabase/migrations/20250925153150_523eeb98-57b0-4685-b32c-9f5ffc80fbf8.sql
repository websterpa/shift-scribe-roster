CREATE OR REPLACE FUNCTION public.rpc_requirements_token_counts(version_id uuid)
 RETURNS TABLE(token text, cnt integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH version_config AS (
  SELECT rc.staffing_requirements
  FROM roster_versions rv
  JOIN roster_config rc ON rc.id = rv.config_id
  WHERE rv.id = rpc_requirements_token_counts.version_id
),
requirements AS (
  SELECT 
    'D' as token, 
    COALESCE((staffing_requirements->>'day_shift_staff')::int, 0) as cnt
  FROM version_config
  UNION ALL
  SELECT 
    'E' as token, 
    COALESCE((staffing_requirements->>'early_shift_staff')::int, 0) as cnt
  FROM version_config
  UNION ALL
  SELECT 
    'L' as token, 
    COALESCE((staffing_requirements->>'late_shift_staff')::int, 0) as cnt
  FROM version_config
  UNION ALL
  SELECT 
    'N' as token, 
    COALESCE((staffing_requirements->>'night_shift_staff')::int, 0) as cnt
  FROM version_config
)
SELECT token, cnt::int
FROM requirements 
WHERE cnt > 0
ORDER BY token;
$function$