import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface RosterOptimizationStatusProps {
  isOptimizing: boolean;
  timeRemaining?: number;
  onCancel?: () => void;
}

/**
 * Component to display optimization progress during roster generation
 * Shows "Optimising roster (up to 5s)..." message as required by runbook
 */
export const RosterOptimizationStatus: React.FC<RosterOptimizationStatusProps> = ({
  isOptimizing,
  timeRemaining,
  onCancel
}) => {
  if (!isOptimizing) {
    return null;
  }

  const progressValue = timeRemaining ? ((5 - timeRemaining) / 5) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center space-x-3 mb-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <h3 className="text-lg font-semibold">Optimising roster</h3>
        </div>
        
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Optimising roster (up to 5s)...
          </p>
          
          {timeRemaining !== undefined && (
            <>
              <Progress value={progressValue} className="w-full" />
              <p className="text-xs text-muted-foreground text-center">
                {timeRemaining.toFixed(1)}s remaining
              </p>
            </>
          )}
          
          <div className="text-xs text-muted-foreground">
            • Enforcing rest rules and eligibility
            • Optimizing coverage and fairness
            • Checking compliance requirements
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full mt-4 px-4 py-2 text-sm border border-border rounded hover:bg-muted transition-colors"
            >
              Cancel Optimization
            </button>
          )}
        </div>
      </div>
    </div>
  );
};