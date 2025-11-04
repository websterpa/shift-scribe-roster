-- Create feasibility_scenarios table for persisting calculator states
CREATE TABLE public.feasibility_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pattern_id UUID REFERENCES public.site_patterns(id),
  pattern_name TEXT,
  staff_count INTEGER,
  shift_length NUMERIC NOT NULL,
  buffer_percent NUMERIC NOT NULL,
  required_shifts_per_day INTEGER NOT NULL DEFAULT 3,
  avg_weekly_hours NUMERIC,
  required_staff NUMERIC,
  utilization_pct NUMERIC,
  is_wtd_compliant BOOLEAN DEFAULT false,
  total_breaches INTEGER DEFAULT 0,
  avg_rolling NUMERIC,
  max_rolling NUMERIC,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.feasibility_scenarios ENABLE ROW LEVEL SECURITY;

-- Users can view their own scenarios
CREATE POLICY "Users can view their own scenarios"
  ON public.feasibility_scenarios
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own scenarios
CREATE POLICY "Users can create their own scenarios"
  ON public.feasibility_scenarios
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own scenarios
CREATE POLICY "Users can update their own scenarios"
  ON public.feasibility_scenarios
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own scenarios
CREATE POLICY "Users can delete their own scenarios"
  ON public.feasibility_scenarios
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_feasibility_scenarios_user_id ON public.feasibility_scenarios(user_id);
CREATE INDEX idx_feasibility_scenarios_created_at ON public.feasibility_scenarios(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_feasibility_scenarios_updated_at
  BEFORE UPDATE ON public.feasibility_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();