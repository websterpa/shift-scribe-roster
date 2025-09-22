-- Fix remaining admin functions search_path
CREATE OR REPLACE FUNCTION public.get_admin_status(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_admin, false) 
  FROM public.staff_profiles 
  WHERE user_id = check_user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_admin_status(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_admin, false) 
  FROM public.staff_profiles 
  WHERE user_id = check_user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_admin, false) 
  FROM public.staff_profiles 
  WHERE staff_profiles.user_id = COALESCE($1, auth.uid())
  LIMIT 1;
$$;