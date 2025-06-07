
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
      console.log('useSubscription: Fetching admin status for user:', user?.id);
      
      // Check if user is admin first
      const { data: adminResult, error: adminError } = await supabase
        .rpc('is_admin', { user_id: user?.id });

      console.log('useSubscription: Admin check result:', { adminResult, adminError });

      if (adminError) {
        logger.error(new Error('Failed to check admin status'), { error: adminError });
        console.error('useSubscription: Admin check failed:', adminError);
        setIsAdmin(false);
      } else {
        const adminStatus = adminResult || false;
        setIsAdmin(adminStatus);
        console.log('useSubscription: Setting admin status to:', adminStatus);
        logger.info('Admin status checked', { isAdmin: adminStatus });
      }

      // Fetch subscription data
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        logger.error(new Error('Failed to fetch subscription'), { error });
        console.error('useSubscription: Subscription fetch failed:', error);
        setError(error.message);
        return;
      }

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
      logger.info('Subscription fetched successfully', { tier: typedSubscription.subscription_tier });
    } catch (err: any) {
      logger.error(new Error('Subscription fetch error'), { error: err });
      console.error('useSubscription: Unexpected error:', err);
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const hasProAccess = () => {
    console.log('useSubscription: Checking Pro access - isAdmin:', isAdmin, 'subscription:', subscription);
    
    // Admin users always have Pro access
    if (isAdmin) {
      console.log('useSubscription: Admin user granted Pro access');
      logger.info('Admin user granted Pro access');
      return true;
    }

    if (!subscription) {
      console.log('useSubscription: No subscription found, denying Pro access');
      return false;
    }
    
    if (subscription.subscription_tier !== 'pro') {
      console.log('useSubscription: Subscription tier is not pro:', subscription.subscription_tier);
      return false;
    }
    
    if (subscription.subscription_status !== 'active') {
      console.log('useSubscription: Subscription status is not active:', subscription.subscription_status);
      return false;
    }
    
    // Check if subscription hasn't expired
    if (subscription.subscription_end_date) {
      const endDate = new Date(subscription.subscription_end_date);
      const now = new Date();
      const hasExpired = endDate <= now;
      console.log('useSubscription: Checking expiration - endDate:', endDate, 'now:', now, 'hasExpired:', hasExpired);
      return !hasExpired;
    }
    
    console.log('useSubscription: Pro access granted via subscription');
    return true;
  };

  const canViewRosters = () => {
    return hasProAccess();
  };

  const refreshSubscription = () => {
    fetchSubscriptionAndAdminStatus();
  };

  const proAccess = hasProAccess();
  console.log('useSubscription: Final Pro access result:', proAccess);

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
