-- Fix remaining search_path issue for existing functions
-- Update any existing functions that don't have search_path set

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is an admin signup based on metadata
  IF NEW.raw_user_meta_data ? 'is_admin' AND (NEW.raw_user_meta_data ->> 'is_admin')::boolean = true THEN
    -- Insert or update profiles table
    INSERT INTO public.profiles (
      user_id,
      email,
      full_name,
      is_admin,
      terms_accepted,
      terms_accepted_at,
      privacy_accepted,
      privacy_accepted_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
      true,
      true,
      NOW(),
      true,
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      is_admin = EXCLUDED.is_admin,
      updated_at = NOW();
    
    -- Update existing subscriptions table
    INSERT INTO public.subscriptions (
      user_id,
      subscription_tier,
      subscription_status
    )
    VALUES (
      NEW.id,
      'pro',
      'active'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      subscription_tier = 'pro',
      subscription_status = 'active',
      updated_at = NOW();
  ELSE
    -- Regular user signup
    INSERT INTO public.profiles (
      user_id,
      email,
      full_name,
      terms_accepted,
      terms_accepted_at,
      privacy_accepted,
      privacy_accepted_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
      COALESCE((NEW.raw_user_meta_data ->> 'terms_accepted')::boolean, false),
      CASE WHEN (NEW.raw_user_meta_data ->> 'terms_accepted')::boolean = true THEN NOW() ELSE NULL END,
      COALESCE((NEW.raw_user_meta_data ->> 'privacy_accepted')::boolean, false),
      CASE WHEN (NEW.raw_user_meta_data ->> 'privacy_accepted')::boolean = true THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = NOW();
    
    -- Create free subscription for regular users
    INSERT INTO public.subscriptions (
      user_id,
      subscription_tier,
      subscription_status
    )
    VALUES (
      NEW.id,
      'free',
      'active'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      subscription_tier = COALESCE(public.subscriptions.subscription_tier, 'free'),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;