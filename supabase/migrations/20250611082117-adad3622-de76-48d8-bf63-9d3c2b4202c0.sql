
-- Create table for custom patterns
CREATE TABLE public.custom_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('8h', '12h')),
  pattern TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.custom_patterns ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own patterns
CREATE POLICY "Users can view their own patterns" 
  ON public.custom_patterns 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own patterns
CREATE POLICY "Users can create their own patterns" 
  ON public.custom_patterns 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own patterns
CREATE POLICY "Users can update their own patterns" 
  ON public.custom_patterns 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy for users to delete their own patterns
CREATE POLICY "Users can delete their own patterns" 
  ON public.custom_patterns 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add comment to document the table
COMMENT ON TABLE public.custom_patterns IS 'User-created custom shift patterns for roster configurations';
