-- Add pattern linkage to staff_profiles
alter table public.staff_profiles
add column if not exists pattern_id uuid references public.site_patterns(id) on delete set null,
add column if not exists pattern_offset integer default 0;

-- Add index for faster pattern lookups
create index if not exists idx_staff_profiles_pattern_id on public.staff_profiles(pattern_id);

-- Add comment for documentation
comment on column public.staff_profiles.pattern_id is 'Reference to the repeating shift pattern this staff member follows';
comment on column public.staff_profiles.pattern_offset is 'Starting index in the pattern sequence (0-based)';