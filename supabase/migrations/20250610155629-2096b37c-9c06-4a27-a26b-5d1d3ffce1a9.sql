
-- Add new columns to staff_profiles table for enhanced availability tracking
ALTER TABLE public.staff_profiles 
ADD COLUMN availability_status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN unavailability_reason TEXT,
ADD COLUMN unavailable_from DATE,
ADD COLUMN expected_return_date DATE,
ADD COLUMN unavailability_notes TEXT;

-- Add a check constraint to ensure valid availability statuses
ALTER TABLE public.staff_profiles 
ADD CONSTRAINT check_availability_status 
CHECK (availability_status IN ('active', 'temporarily_unavailable', 'inactive'));

-- Create an index for better query performance on availability status
CREATE INDEX idx_staff_availability_status ON public.staff_profiles(availability_status);
