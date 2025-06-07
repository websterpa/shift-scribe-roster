
import { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/utils/errorLogger';

const logger = createLogger('useSubscription');

export interface SubscriptionData {
  id: string;
  subscription_tier: 'free' | 'pro';
  subscription_status: 'active' | 'cancelled' | 'expired';
  subscription_start_date?: string;
  subscription_end_date?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

async function checkAdmin(userId: string): Promise<boolean> {
  logger.info('🔍 Checking admin status for user:', userId);
  
  try {
    // First try the new get_admin_status function
    console.log('useSubscription: Trying RPC get_admin_status function...');
    const { data: adminResult, error: adminError } = await supabase
      .rpc('get_admin_status', { check_user_id: userId });

    if (adminError) {
      console.error('useSubscription: RPC get_admin_status failed:', adminError);
    } else if (adminResult !== null) {
      console.log('useSubscription: 🎯 RPC get_admin_status result:', adminResult);
      return adminResult === true;
    }

    // Fallback to original is_admin function
    console.log('useSubscription: Trying RPC is_admin function...');
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('is_admin', { user_id: userId });

    if (rpcError) {
      console.error('useSubscription: RPC is_admin failed:', rpcError);
    } else if (rpcResult !== null) {
      console.log('useSubscription: 🎯 RPC is_admin result:', rpcResult);
      return rpcResult === true;
    }

    // Final fallback to direct staff_profiles query
    console.log('useSubscription: Fallback to staff_profiles query...');
    const { data: profileData, error: profileError } = await supabase
      .from('staff_profiles')
      .select('is_admin')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('useSubscription: staff_profiles query failed:', profileError);
      return false;
    }

    const adminStatus = profileData?.is_admin || false;
    console.log('useSubscription: 🎯 Fallback admin status:', adminStatus);
    return adminStatus;

  } catch (error) {
    console.error('useSubscription: Exception in checkAdmin:', error);
    return false;
  }
}

export function useSubscription() {
  const { user, isAuthenticated } = useSupabaseAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      console.log('useSubscription: No authenticated user, resetting state');
      setSubscription(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    fetchSubscriptionAndAdminStatus();
  }, [user, isAuthenticated]);

  const fetchSubscriptionAndAdminStatus = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      console.log('useSubscription: 🚀 Starting comprehensive check for user:', user.id);

      // Check admin status using the robust checkAdmin function
      const adminStatus = await checkAdmin(user.id);
      setIsAdmin(adminStatus);
      console.log('useSubscription: 👑 ADMIN STATUS SET TO:', adminStatus);

      // Fetch subscription data
      console.log('useSubscription: 📊 Fetching subscription data...');
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subError) {
        console.error('useSubscription: Subscription fetch failed:', subError);
        if (!adminStatus) {
          setError(subError.message);
        }
        setSubscription(null);
      } else {
        console.log('useSubscription: 📊 Subscription data retrieved:', subData);
        const typedSubscription: SubscriptionData = {
          id: subData.id,
          subscription_tier: subData.subscription_tier as 'free' | 'pro',
          subscription_status: subData.subscription_status as 'active' | 'cancelled' | 'expired',
          subscription_start_date: subData.subscription_start_date,
          subscription_end_date: subData.subscription_end_date,
          stripe_customer_id: subData.stripe_customer_id,
          stripe_subscription_id: subData.stripe_subscription_id,
        };
        setSubscription(typedSubscription);
      }
    } catch (err: any) {
      console.error('useSubscription: Unexpected error in fetchSubscriptionAndAdminStatus:', err);
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const hasProAccess = () => {
    console.log('useSubscription: 🎯 hasProAccess evaluation starting:');
    console.log('  - isAdmin:', isAdmin);
    console.log('  - subscription:', subscription);
    
    // ⭐ CRITICAL: Admin users ALWAYS have Pro access, regardless of subscription
    if (isAdmin) {
      console.log('useSubscription: ✅ 👑 ADMIN ACCESS GRANTED - Pro access via admin status');
      return true;
    }

    // Only check subscription for non-admin users
    if (!subscription) {
      console.log('useSubscription: ❌ No subscription found, no pro access');
      return false;
    }
    
    if (subscription.subscription_tier !== 'pro') {
      console.log('useSubscription: ❌ Not pro tier:', subscription.subscription_tier, '(but not admin, so no access)');
      return false;
    }
    
    if (subscription.subscription_status !== 'active') {
      console.log('useSubscription: ❌ Not active status:', subscription.subscription_status);
      return false;
    }
    
    // Check subscription expiration
    if (subscription.subscription_end_date) {
      const endDate = new Date(subscription.subscription_end_date);
      const now = new Date();
      const hasExpired = endDate <= now;
      console.log('useSubscription: Expiration check - expired:', hasExpired);
      if (hasExpired) {
        return false;
      }
    }
    
    console.log('useSubscription: ✅ Pro access via valid subscription');
    return true;
  };

  const canViewRosters = () => {
    return hasProAccess();
  };

  const refreshSubscription = () => {
    fetchSubscriptionAndAdminStatus();
  };

  const proAccess = hasProAccess();
  console.log('useSubscription: 🎯 FINAL RESULT - hasProAccess:', proAccess, 'isAdmin:', isAdmin);

  return {
    subscription,
    loading,
    error,
    isAdmin,
    hasProAccess: proAccess,
    canViewRosters: canViewRosters(),
    refreshSubscription
  };
}
