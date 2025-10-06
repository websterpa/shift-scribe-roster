import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Supabase configuration - hard-coded as required by Lovable
// These keys are safe to commit as they're public anon keys
const supabaseUrl = 'https://vdmqcuoratuedqiwvimg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbXFjdW9yYXR1ZWRxaXd2aW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NzY3NDUsImV4cCI6MjA2NDE1Mjc0NX0.FgrXGl1Fy_x_y_hfBwMiNTPc_1Zkwb2n3TQqEUYHEp0';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);