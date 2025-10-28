-- Update all existing NULL or false values to TRUE for WTD opt-out
update public.staff_profiles 
set opted_out_wtd = true 
where opted_out_wtd is null or opted_out_wtd = false;

-- Make the column NOT NULL and change default to TRUE
alter table public.staff_profiles 
alter column opted_out_wtd set not null,
alter column opted_out_wtd set default true;