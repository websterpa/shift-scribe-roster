-- Add feasibility_snapshot column to roster_versions
ALTER TABLE roster_versions 
ADD COLUMN IF NOT EXISTS feasibility_snapshot JSONB;

COMMENT ON COLUMN roster_versions.feasibility_snapshot IS 
'Snapshot of feasibility configuration at roster generation time.
Used to detect drift between the generated roster and current live config.
Structure:
{
  "pattern_id": "uuid",
  "pattern_name": "string",
  "framework": "8h" | "12h",
  "requirements_v2": RequirementsV2,
  "buffer_pct": number,
  "standard_contract_hours": number,
  "auto_reduce_enabled": boolean,
  "timestamp": "ISO string"
}';