import { Badge } from '@/components/ui/badge';
import { Moon } from 'lucide-react';

interface NightShiftBadgeProps {
  nightCount: number;
  totalAssignments: number;
}

/**
 * DEV-only badge showing Night shift count in roster views
 * Helps diagnose "missing nights" issues
 */
export default function NightShiftBadge({ nightCount, totalAssignments }: NightShiftBadgeProps) {
  if (!import.meta.env.DEV) return null;
  if (totalAssignments === 0) return null;

  const percentage = ((nightCount / totalAssignments) * 100).toFixed(1);
  const variant = nightCount > 0 ? 'default' : 'destructive';

  return (
    <Badge variant={variant} className="gap-1">
      <Moon className="w-3 h-3" />
      Nights: {nightCount} ({percentage}%)
    </Badge>
  );
}
