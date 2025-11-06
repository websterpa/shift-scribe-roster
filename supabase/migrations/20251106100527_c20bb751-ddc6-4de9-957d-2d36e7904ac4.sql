-- Add requirements_v2 JSONB column to roster_config
ALTER TABLE roster_config 
ADD COLUMN IF NOT EXISTS requirements_v2 JSONB;

COMMENT ON COLUMN roster_config.requirements_v2 IS 
'Unified requirements schema v2 with day-type grouping:
{
  "framework": "8h" | "12h",
  "days": {
    "weekdays": { "E"?: number, "L"?: number, "N"?: number, "D"?: number },
    "saturday": { "E"?: number, "L"?: number, "N"?: number, "D"?: number },
    "sunday": { "E"?: number, "L"?: number, "N"?: number, "D"?: number }
  }
}';

-- Backfill existing rows from legacy staffing_requirements
UPDATE roster_config
SET requirements_v2 = jsonb_build_object(
  'framework', shift_type,
  'days', 
    CASE 
      WHEN shift_type = '8h' THEN jsonb_build_object(
        'weekdays', jsonb_build_object(
          'E', COALESCE((staffing_requirements->>'early_shift_staff')::int, 0),
          'L', COALESCE((staffing_requirements->>'late_shift_staff')::int, 0),
          'N', COALESCE((staffing_requirements->>'night_shift_staff')::int, 0)
        ),
        'saturday', jsonb_build_object(
          'E', COALESCE((staffing_requirements->>'early_shift_staff')::int, 0),
          'L', COALESCE((staffing_requirements->>'late_shift_staff')::int, 0),
          'N', COALESCE((staffing_requirements->>'night_shift_staff')::int, 0)
        ),
        'sunday', jsonb_build_object(
          'E', COALESCE((staffing_requirements->>'early_shift_staff')::int, 0),
          'L', COALESCE((staffing_requirements->>'late_shift_staff')::int, 0),
          'N', COALESCE((staffing_requirements->>'night_shift_staff')::int, 0)
        )
      )
      WHEN shift_type = '12h' THEN jsonb_build_object(
        'weekdays', jsonb_build_object(
          'D', COALESCE((staffing_requirements->>'day_shift_staff')::int, 0),
          'N', COALESCE((staffing_requirements->>'night_shift_staff')::int, 0)
        ),
        'saturday', jsonb_build_object(
          'D', COALESCE((staffing_requirements->>'day_shift_staff')::int, 0),
          'N', COALESCE((staffing_requirements->>'night_shift_staff')::int, 0)
        ),
        'sunday', jsonb_build_object(
          'D', COALESCE((staffing_requirements->>'day_shift_staff')::int, 0),
          'N', COALESCE((staffing_requirements->>'night_shift_staff')::int, 0)
        )
      )
      ELSE '{}'::jsonb
    END
)
WHERE requirements_v2 IS NULL;