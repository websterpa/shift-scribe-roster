-- Add pattern_locked flag to roster_config table
alter table public.roster_config
add column if not exists pattern_locked boolean default true;

-- Add comment for documentation
comment on column public.roster_config.pattern_locked is 'If true, generate rosters using staff-specific pattern expansion. If false, use coverage-first allocation.';

-- Add index for filtering by mode
create index if not exists idx_roster_config_pattern_locked on public.roster_config(pattern_locked);