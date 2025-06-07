
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
      
      // Check if user is admin
      const { data: adminResult, error: adminError } = await supabase
        .rpc('is_admin', { user_id: user?.id });

      if (adminError) {
        logger.error(new Error('Failed to check admin status'), { error: adminError });
      } else {
        setIsAdmin(adminResult || false);
        logger.info('Admin status checked', { isAdmin: adminResult });
      }

      // Fetch subscription data
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        logger.error(new Error('Failed to fetch subscription'), { error });
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
      logger.info('Subscription fetched successfully', { tier: typedSubscription.subscription_tier });
    } catch (err: any) {
      logger.error(new Error('Subscription fetch error'), { error: err });
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const hasProAccess = () => {
    // Admin users always have Pro access
    if (isAdmin) {
      logger.info('Admin user granted Pro access');
      return true;
    }

    if (!subscription) return false;
    
    if (subscription.subscription_tier !== 'pro') return false;
    if (subscription.subscription_status !== 'active') return false;
    
    // Check if subscription hasn't expired
    if (subscription.subscription_end_date) {
      const endDate = new Date(subscription.subscription_end_date);
      const now = new Date();
      return endDate > now;
    }
    
    return true;
  };

  const canViewRosters = () => {
    return hasProAccess();
  };

  const refreshSubscription = () => {
    fetchSubscriptionAndAdminStatus();
  };

  return {
    subscription,
    loading,
    error,
    isAdmin,
    hasProAccess: hasProAccess(),
    canViewRosters: canViewRosters(),
    refreshSubscription
  };
}
