
import React from 'react';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WTDComplianceIndicatorProps {
  weeklyHours: number;
  maxHours: number;
  averageHours?: number;
  optedOut?: boolean;
  className?: string;
}

export const WTDComplianceIndicator = ({
  weeklyHours,
  maxHours,
  averageHours,
  optedOut = false,
  className = ""
}: WTDComplianceIndicatorProps) => {
  
  const getComplianceStatus = () => {
    if (optedOut) {
      return { 
        status: 'opted-out', 
        color: 'bg-gray-100 text-gray-700', 
        icon: Clock,
        message: 'Opted out of WTD limits'
      };
    }
    
    if (weeklyHours > maxHours) {
      return { 
        status: 'over-limit', 
        color: 'bg-red-100 text-red-800', 
        icon: AlertTriangle,
        message: `Over WTD limit: ${weeklyHours}h/${maxHours}h`
      };
    }
    
    if (weeklyHours > maxHours * 0.9) {
      return { 
        status: 'approaching-limit', 
        color: 'bg-yellow-100 text-yellow-800', 
        icon: AlertTriangle,
        message: `Approaching WTD limit: ${weeklyHours}h/${maxHours}h`
      };
    }
    
    return { 
      status: 'compliant', 
      color: 'bg-green-100 text-green-800', 
      icon: CheckCircle,
      message: `WTD compliant: ${weeklyHours}h/${maxHours}h`
    };
  };

  const compliance = getComplianceStatus();
  const Icon = compliance.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge 
            variant="outline" 
            className={`${compliance.color} ${className} flex items-center gap-1`}
          >
            <Icon className="h-3 w-3" />
            <span className="text-xs font-medium">
              {optedOut ? 'WTD-' : `${weeklyHours}h`}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div>{compliance.message}</div>
            {averageHours && (
              <div className="text-gray-500">
                Rolling avg: {averageHours.toFixed(1)}h
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
