
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdminAuth() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUser(user);
        
        // Use the corrected is_admin RPC function
        const { data: adminResult, error: adminError } = await supabase
          .rpc('is_admin', { user_id: user.id });

        console.log('useAdminAuth: Admin check result:', { adminResult, adminError });

        if (adminError) {
          console.error('useAdminAuth: Admin check failed:', adminError);
          setIsAdmin(false);
        } else {
          setIsAdmin(adminResult === true);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('useAdminAuth: Auth check error:', error);
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  return { loading, isAdmin, user };
}
