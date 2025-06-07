
import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Star, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SubscriptionGateProps {
  children: React.ReactNode;
  feature: string;
  description?: string;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ 
  children, 
  feature, 
  description 
}) => {
  const { hasProAccess, loading, subscription } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (hasProAccess) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Upgrade to Pro</CardTitle>
          <CardDescription>
            {description || `Access to ${feature} requires a Pro subscription`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-left space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <Star className="w-4 h-4 text-yellow-500 mr-2" />
              Full roster generation
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Star className="w-4 h-4 text-yellow-500 mr-2" />
              Advanced scheduling algorithms
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Star className="w-4 h-4 text-yellow-500 mr-2" />
              WTR compliance monitoring
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Star className="w-4 h-4 text-yellow-500 mr-2" />
              Export capabilities
            </div>
          </div>
          
          <div className="pt-4">
            <div className="text-center mb-4">
              <span className="text-3xl font-bold text-gray-900">£49</span>
              <span className="text-gray-600">/month</span>
            </div>
            
            <Link to="/pricing" className="block">
              <Button className="w-full" size="lg">
                <CreditCard className="w-4 h-4 mr-2" />
                Upgrade Now
              </Button>
            </Link>
          </div>
          
          <p className="text-xs text-gray-500">
            Current plan: {subscription?.subscription_tier === 'free' ? 'Free' : 'Pro'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
