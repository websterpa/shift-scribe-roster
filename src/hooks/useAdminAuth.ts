
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

async function checkAdminStatus(userId: string): Promise<boolean> {
  try {
    console.log('useAdminAuth: Checking admin status for user:', userId);
    
    // First try the new get_admin_status function
    const { data: adminResult, error: adminError } = await supabase
      .rpc('get_admin_status', { check_user_id: userId });

    if (adminError) {
      console.error('useAdminAuth: RPC get_admin_status failed:', adminError);
    } else if (adminResult !== null) {
      console.log('useAdminAuth: RPC get_admin_status result:', adminResult);
      return adminResult === true;
    }

    // Fallback to original is_admin function
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('is_admin', { user_id: userId });

    if (rpcError) {
      console.error('useAdminAuth: RPC is_admin failed:', rpcError);
    } else if (rpcResult !== null) {
      console.log('useAdminAuth: RPC is_admin result:', rpcResult);
      return rpcResult === true;
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
    console.log('useAdminAuth: Fallback admin status:', adminStatus);
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
