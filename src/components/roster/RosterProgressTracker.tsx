import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, Loader2 } from 'lucide-react';

interface RosterProgressTrackerProps {
  isActive: boolean;
  progress: number; // 0-100
  message: string;
  timeRemaining: number; // seconds
}

export const RosterProgressTracker: React.FC<RosterProgressTrackerProps> = ({
  isActive,
  progress,
  message,
  timeRemaining
}) => {
  if (!isActive) return null;

  const getProgressColor = (progress: number) => {
    if (progress < 30) return 'bg-blue-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary">
                  Optimising Roster
                </h3>
                <p className="text-sm text-muted-foreground">
                  Please wait while we generate your optimal roster...
                </p>
              </div>
            </div>
            
            {timeRemaining > 0 && (
              <Badge variant="outline" className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                ~{Math.ceil(timeRemaining)}s remaining
              </Badge>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{message}</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            
            <Progress 
              value={progress} 
              className="h-3"
            />
          </div>

          {/* Progress Steps */}
          <div className="grid grid-cols-5 gap-2 text-xs">
            <div className={`text-center ${progress >= 20 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              Staff Analysis
            </div>
            <div className={`text-center ${progress >= 40 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              Leave Check
            </div>
            <div className={`text-center ${progress >= 60 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              Pattern Optimization
            </div>
            <div className={`text-center ${progress >= 80 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              Compliance Check
            </div>
            <div className={`text-center ${progress >= 100 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              Finalization
            </div>
          </div>

          {/* Optimization Note */}
          <div className="bg-muted/50 p-3 rounded-md">
            <p className="text-xs text-muted-foreground text-center">
              💡 The system is evaluating thousands of possible roster combinations to find the optimal solution 
              that meets all compliance rules and coverage requirements.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};