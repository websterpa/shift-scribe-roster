CREATE OR REPLACE FUNCTION public.rpc_night_gap(version_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH requirements AS (
  SELECT COALESCE(SUM(cnt), 0)::int as need
  FROM rpc_requirements_token_counts(rpc_night_gap.version_id)
  WHERE token = 'N'
),
assignments AS (
  SELECT COALESCE(SUM(cnt), 0)::int as planned
  FROM rpc_version_token_counts(rpc_night_gap.version_id)
  WHERE token = 'N'
)
SELECT jsonb_build_object(
  'need', (SELECT need FROM requirements),
  'planned', (SELECT planned FROM assignments),
  'gap', (SELECT need FROM requirements) - (SELECT planned FROM assignments)
);
$function$