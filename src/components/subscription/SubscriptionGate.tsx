
import React from 'react';

interface SubscriptionGateProps {
  children: React.ReactNode;
  feature: string;
  description?: string;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ 
  children
}) => {
  // Always render children - no more subscription gating
  return <>{children}</>;
};
