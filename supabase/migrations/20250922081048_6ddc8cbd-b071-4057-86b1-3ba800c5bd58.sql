-- Fix security warnings by setting search_path for all functions
-- =========================================================

-- Update helper function
CREATE OR REPLACE FUNCTION _hours_for_shift(token text)
RETURNS int
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE WHEN token IN ('D','N') THEN 12 ELSE 8 END
$$;

-- Update KPIs RPC
CREATE OR REPLACE FUNCTION rpc_roster_kpis(version_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
WITH assignments AS (
  SELECT 
    shift_code,
    COUNT(*) as planned_count,
    SUM(COALESCE(hours, _hours_for_shift(shift_code))) as total_hours,
    SUM(COALESCE(cost, 0)) as total_cost
  FROM roster_assignments
  WHERE version_id = rpc_roster_kpis.version_id
  GROUP BY shift_code
),
totals AS (
  SELECT
    COALESCE(SUM(planned_count), 0)::int as total_assignments,
    COALESCE(SUM(total_hours), 0)::numeric as total_hours,
    COALESCE(SUM(total_cost), 0)::numeric as total_cost
  FROM assignments
),
version_info AS (
  SELECT rv.config_id
  FROM roster_versions rv
  WHERE rv.id = rpc_roster_kpis.version_id
),
budget_info AS (
  SELECT 
    AVG(budget_warn_threshold) as site_budget
  FROM site_settings
  LIMIT 1
)
SELECT jsonb_build_object(
  'coverageFillPct', CASE WHEN t.total_assignments > 0 THEN 95 ELSE 0 END,
  'totalHours', COALESCE(t.total_hours, 0),
  'otHours', 0,
  'budgetEstimated', COALESCE(t.total_cost, 0),
  'budgetSet', COALESCE(b.site_budget, 50000),
  'budgetVariance', COALESCE(t.total_cost - COALESCE(b.site_budget, 50000), 0)
)
FROM totals t
CROSS JOIN budget_info b;
$$;

-- Update Staffing Matrix RPC
CREATE OR REPLACE FUNCTION rpc_roster_staffing_matrix(version_id uuid)
RETURNS setof jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
WITH daily_assignments AS (
  SELECT 
    EXTRACT(DOW FROM date)::int as day_idx,
    shift_code,
    COUNT(*) as planned
  FROM roster_assignments
  WHERE version_id = rpc_roster_staffing_matrix.version_id
  GROUP BY EXTRACT(DOW FROM date), shift_code
),
shift_summary AS (
  SELECT 
    day_idx,
    jsonb_object_agg(
      shift_code, 
      jsonb_build_object(
        'need', CASE shift_code 
          WHEN 'D' THEN 3 
          WHEN 'N' THEN 2 
          WHEN 'E' THEN 2 
          WHEN 'L' THEN 2 
          ELSE 1 
        END,
        'planned', planned
      )
    ) as shifts
  FROM daily_assignments
  GROUP BY day_idx
)
SELECT jsonb_build_object(
  'day', CASE day_idx
    WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue'
    WHEN 3 THEN 'Wed' WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri' 
    WHEN 6 THEN 'Sat'
  END,
  'shifts', shifts
)
FROM shift_summary
ORDER BY day_idx;
$$;

-- Update Staff Tours RPC
CREATE OR REPLACE FUNCTION rpc_roster_tours(version_id uuid)
RETURNS setof jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
WITH staff_assignments AS (
  SELECT 
    ra.staff_id,
    ra.shift_code,
    ra.date,
    EXTRACT(DOW FROM ra.date)::int as day_idx,
    sp.first_name || ' ' || sp.last_name as display_name,
    COALESCE(sp.role, 'Staff') as role
  FROM roster_assignments ra
  LEFT JOIN staff_profiles sp ON sp.id = ra.staff_id
  WHERE ra.version_id = rpc_roster_tours.version_id
)
SELECT jsonb_build_object(
  'staffId', staff_id,
  'name', COALESCE(MAX(display_name), 'Unknown Staff'),
  'role', COALESCE(MAX(role), 'Staff'),
  'shifts', COUNT(*),
  'nights', COUNT(*) FILTER (WHERE shift_code = 'N'),
  'weekends', COUNT(*) FILTER (WHERE day_idx IN (0,6)),
  'publicHolidays', 0,
  'overtimeHours', 0
)
FROM staff_assignments
GROUP BY staff_id;
$$;

-- Update Budget RPC
CREATE OR REPLACE FUNCTION rpc_roster_budget(version_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
WITH cost_data AS (
  SELECT 
    SUM(COALESCE(cost, 0)) as estimated_cost
  FROM roster_assignments
  WHERE version_id = rpc_roster_budget.version_id
),
budget_data AS (
  SELECT 
    AVG(budget_warn_threshold) as site_budget
  FROM site_settings
  LIMIT 1
)
SELECT jsonb_build_object(
  'estimated', COALESCE(c.estimated_cost, 0),
  'budget', COALESCE(b.site_budget, 50000),
  'variance', COALESCE(c.estimated_cost - COALESCE(b.site_budget, 50000), 0)
)
FROM cost_data c
CROSS JOIN budget_data b;
$$;