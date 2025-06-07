
import { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

export interface SubscriptionData {
  id: string;
  subscription_tier: 'pro';
  subscription_status: 'active';
  subscription_start_date?: string;
  subscription_end_date?: string;
}

export function useSubscription() {
  const { user, isAuthenticated } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);
  
  // Always return Pro access for all users
  const subscription: SubscriptionData = {
    id: 'default-pro',
    subscription_tier: 'pro',
    subscription_status: 'active',
    subscription_start_date: new Date().toISOString(),
  };

  return {
    subscription,
    loading,
    error: null,
    isAdmin: false, // Keep admin separate from Pro access
    hasProAccess: true, // Always true
    canViewRosters: () => true, // Always true
    refreshSubscription: () => {} // No-op
  };
}
