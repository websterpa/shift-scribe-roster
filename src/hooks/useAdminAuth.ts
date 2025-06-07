
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

async function checkAdminStatus(userId: string): Promise<boolean> {
  try {
    console.log('useAdminAuth: Checking admin status for user:', userId);
    
    // Try the get_admin_status function first
    const { data: adminResult, error: adminError } = await supabase
      .rpc('get_admin_status', { check_user_id: userId });

    if (adminError) {
      console.error('useAdminAuth: RPC get_admin_status failed:', adminError);
    } else if (adminResult !== null) {
      console.log('useAdminAuth: RPC get_admin_status result:', adminResult);
      return adminResult === true;
    }

    // Fallback to direct staff_profiles query
    console.log('useAdminAuth: Fallback to staff_profiles query...');
    const { data: profileData, error: profileError } = await supabase
      .from('staff_profiles')
      .select('is_admin')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('useAdminAuth: staff_profiles query failed:', profileError);
      return false;
    }

    const adminStatus = profileData?.is_admin || false;
    console.log('useAdminAuth: Admin status:', adminStatus);
    return adminStatus;

  } catch (error) {
    console.error('useAdminAuth: Exception in checkAdminStatus:', error);
    return false;
  }
}

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
        console.log('useAdminAuth: User found, checking admin status...');
        
        const adminStatus = await checkAdminStatus(user.id);
        setIsAdmin(adminStatus);
        console.log('useAdminAuth: Final admin status:', adminStatus);
      } else {
        console.log('useAdminAuth: No user found');
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
