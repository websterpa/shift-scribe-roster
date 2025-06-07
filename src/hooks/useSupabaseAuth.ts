
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/utils/errorLogger';

const logger = createLogger('useSupabaseAuth');

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logger.info('Auth state changed', { event, hasSession: !!session });
        setSession(session);
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session?.user);
        setLoading(false);
        
        // Update localStorage for compatibility with existing code
        if (session?.user) {
          localStorage.setItem('demo_authenticated', 'true');
        } else {
          localStorage.removeItem('demo_authenticated');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        logger.error(new Error('Failed to get session'), { error });
      }
      
      logger.info('Initial session check', { hasSession: !!session });
      setSession(session);
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session?.user);
      setLoading(false);
      
      if (session?.user) {
        localStorage.setItem('demo_authenticated', 'true');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    logger.info('Signing out user');
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error(new Error('Sign out failed'), { error });
      throw error;
    }
    localStorage.removeItem('demo_authenticated');
  };

  return {
    user,
    session,
    loading,
    isAuthenticated,
    signOut
  };
}
