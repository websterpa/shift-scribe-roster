-- Activate JOHN DOE to complete the 11-person roster pool
UPDATE public.staff_profiles
SET is_active = TRUE
WHERE email = 'JOHN.DOE@GMAIL.COM'
  AND is_active = FALSE;