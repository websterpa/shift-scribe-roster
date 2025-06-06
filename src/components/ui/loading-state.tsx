
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  spinnerOnly?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = "Loading...", 
  className = "",
  size = 'md',
  spinnerOnly = false
}) => {
  console.log('Rendering LoadingState', { message, size, spinnerOnly });
  
  const spinnerSizeMap = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };
  
  const spinnerElement = (
    <Loader2 className={`animate-spin ${spinnerSizeMap[size]} ${spinnerOnly ? '' : 'mx-auto mb-2'}`} />
  );
  
  if (spinnerOnly) {
    return spinnerElement;
  }
  
  return (
    <Card className={className}>
      <CardContent className="flex items-center justify-center p-8">
        <div className="text-center">
          {spinnerElement}
          {message && <p>{message}</p>}
        </div>
      </CardContent>
    </Card>
  );
};
