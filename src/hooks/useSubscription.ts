
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

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    fetchSubscription();
  }, [user, isAuthenticated]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
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

      setSubscription(data);
      logger.info('Subscription fetched successfully', { tier: data?.subscription_tier });
    } catch (err: any) {
      logger.error(new Error('Subscription fetch error'), { error: err });
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const hasProAccess = () => {
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
    fetchSubscription();
  };

  return {
    subscription,
    loading,
    error,
    hasProAccess: hasProAccess(),
    canViewRosters: canViewRosters(),
    refreshSubscription
  };
}
