
import React from 'react';

interface SubscriptionGateProps {
  children: React.ReactNode;
  feature: string;
  description?: string;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ 
  children
}) => {
  // All users have Pro access - no gating needed
  return <>{children}</>;
};
