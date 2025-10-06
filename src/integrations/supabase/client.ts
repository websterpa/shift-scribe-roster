import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Supabase configuration from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://vdmqcuoratuedqiwvimg.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbXFjdW9yYXR1ZWRxaXd2aW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NzY3NDUsImV4cCI6MjA2NDE1Mjc0NX0.FgrXGl1Fy_x_y_hfBwMiNTPc_1Zkwb2n3TQqEUYHEp0";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase environment variables. Please check your .env file.");
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);