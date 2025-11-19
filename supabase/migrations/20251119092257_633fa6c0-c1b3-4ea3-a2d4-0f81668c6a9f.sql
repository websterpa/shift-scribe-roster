-- Grant admin privileges to the current user
-- This will update both profiles and staff_profiles tables

-- Update profiles table
UPDATE public.profiles
SET is_admin = true,
    updated_at = now()
WHERE user_id = auth.uid();

-- Update staff_profiles table  
UPDATE public.staff_profiles
SET is_admin = true,
    updated_at = now()
WHERE user_id = auth.uid();

-- If no staff profile exists yet, you may need to check the staff_profiles table
-- and ensure a record exists for your user_id first