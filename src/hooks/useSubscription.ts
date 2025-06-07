
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

export function useSubscription() {
  const { user, isAuthenticated } = useSupabaseAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setSubscription(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    fetchSubscriptionAndAdminStatus();
  }, [user, isAuthenticated]);

  const fetchSubscriptionAndAdminStatus = async () => {
    try {
      setLoading(true);
      console.log('useSubscription: Starting fetch for user:', user?.id);
      
      // Check admin status from staff_profiles using RPC function
      console.log('useSubscription: Checking admin status with RPC...');
      
      const { data: adminResult, error: adminError } = await supabase
        .rpc('is_admin', { user_id: user?.id });

      console.log('useSubscription: Admin RPC result:', { adminResult, adminError, userId: user?.id });

      let adminStatus = false;
      
      if (adminError) {
        console.error('useSubscription: Admin RPC failed:', adminError);
        adminStatus = false;
      } else {
        adminStatus = adminResult === true;
        console.log('useSubscription: Admin status from staff_profiles:', adminStatus);
      }

      setIsAdmin(adminStatus);
      console.log('useSubscription: Final admin status set to:', adminStatus);

      // Fetch subscription data
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      console.log('useSubscription: Subscription query result:', { data, error });

      if (error) {
        console.error('useSubscription: Subscription fetch failed:', error);
        // Don't set error for missing subscription if user is admin
        if (!adminStatus) {
          setError(error.message);
        }
        setSubscription(null);
      } else {
        // Type cast to ensure proper typing
        const typedSubscription: SubscriptionData = {
          id: data.id,
          subscription_tier: data.subscription_tier as 'free' | 'pro',
          subscription_status: data.subscription_status as 'active' | 'cancelled' | 'expired',
          subscription_start_date: data.subscription_start_date,
          subscription_end_date: data.subscription_end_date,
          stripe_customer_id: data.stripe_customer_id,
          stripe_subscription_id: data.stripe_subscription_id,
        };

        setSubscription(typedSubscription);
        console.log('useSubscription: Subscription set:', typedSubscription);
      }
    } catch (err: any) {
      console.error('useSubscription: Unexpected error:', err);
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const hasProAccess = () => {
    console.log('useSubscription: hasProAccess check - isAdmin:', isAdmin, 'subscription:', subscription);
    
    // Admin users from staff_profiles ALWAYS have Pro access regardless of subscription
    if (isAdmin) {
      console.log('useSubscription: ADMIN ACCESS GRANTED - Pro access via staff_profiles admin status');
      return true;
    }

    if (!subscription) {
      console.log('useSubscription: No subscription, no pro access');
      return false;
    }
    
    if (subscription.subscription_tier !== 'pro') {
      console.log('useSubscription: Not pro tier:', subscription.subscription_tier);
      return false;
    }
    
    if (subscription.subscription_status !== 'active') {
      console.log('useSubscription: Not active status:', subscription.subscription_status);
      return false;
    }
    
    // Check if subscription hasn't expired
    if (subscription.subscription_end_date) {
      const endDate = new Date(subscription.subscription_end_date);
      const now = new Date();
      const hasExpired = endDate <= now;
      console.log('useSubscription: Expiration check - expired:', hasExpired);
      return !hasExpired;
    }
    
    console.log('useSubscription: Pro access via valid subscription');
    return true;
  };

  const canViewRosters = () => {
    return hasProAccess();
  };

  const refreshSubscription = () => {
    fetchSubscriptionAndAdminStatus();
  };

  const proAccess = hasProAccess();
  console.log('useSubscription: FINAL RESULT - hasProAccess:', proAccess, 'isAdmin:', isAdmin);

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
