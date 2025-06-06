
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = "Loading..." }) => {
  return (
    <Card>
      <CardContent className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>{message}</p>
        </div>
      </CardContent>
    </Card>
  );
};
