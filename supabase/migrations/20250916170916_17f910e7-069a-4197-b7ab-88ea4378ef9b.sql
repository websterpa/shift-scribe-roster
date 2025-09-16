-- Create site_settings table for storing default rates and role mixes
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  avg_staff_rate NUMERIC NOT NULL DEFAULT 18.00,
  avg_supervisor_rate NUMERIC NOT NULL DEFAULT 24.00,
  role_mix_by_shift JSONB DEFAULT '{"E": 10, "L": 10, "N": 20, "D": 15}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for site settings
CREATE POLICY "Anyone can read site settings" 
ON public.site_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage site settings" 
ON public.site_settings 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.is_admin = true
));

-- Insert default site settings
INSERT INTO public.site_settings (avg_staff_rate, avg_supervisor_rate, role_mix_by_shift) 
VALUES (18.00, 24.00, '{"E": 10, "L": 10, "N": 20, "D": 15, "N": 25}');

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();