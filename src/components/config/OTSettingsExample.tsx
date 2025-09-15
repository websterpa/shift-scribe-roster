import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Settings, Zap } from 'lucide-react';

interface OTSettingsDisplayProps {
  config: {
    shift_type: '8h' | '12h';
    site_start_time: string;
    timezone: string;
    default_ot_hours?: number;
    default_ot_start_local_time?: string;
  };
}

/**
 * Example component showing how OT defaults are configured and displayed
 */
export const OTSettingsExample: React.FC<OTSettingsDisplayProps> = ({ config }) => {
  const systemDefault = config.shift_type === '12h' ? 12 : 8;
  const otHours = config.default_ot_hours ?? systemDefault;
  const otStartTime = config.default_ot_start_local_time ?? config.site_start_time;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Overtime Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Default OT Duration</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={config.default_ot_hours ? 'default' : 'secondary'}>
                  {otHours}h
                </Badge>
                {!config.default_ot_hours && (
                  <span className="text-sm text-muted-foreground">
                    (System default: {systemDefault}h)
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Duration used when creating OT assignments without specific hours
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Default OT Start Time</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={config.default_ot_start_local_time ? 'default' : 'secondary'}>
                  {otStartTime}
                </Badge>
                {!config.default_ot_start_local_time && (
                  <span className="text-sm text-muted-foreground">
                    (Site start time: {config.site_start_time})
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Start time used when creating OT assignments without specific timing
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Example OT Scenarios</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                <span>Standard OT (no custom options)</span>
                <Badge variant="outline">{otHours}h @ {otStartTime}</Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                <span>Custom 4h top-up @ 10:00</span>
                <Badge variant="outline">4h @ 10:00</Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                <span>Evening cover @ 18:30</span>
                <Badge variant="outline">6h @ 18:30</Badge>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
            <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              💡 Configuration Benefits
            </h5>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Consistent OT patterns across your organization</li>
              <li>• Faster roster creation with sensible defaults</li>
              <li>• Individual assignments can still override for flexibility</li>
              <li>• Proper rest rule validation for all OT shifts</li>
              <li>• Accurate costing with automatic OT multipliers</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sample Configuration JSON</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
            <pre className="text-sm overflow-x-auto">
{JSON.stringify({
  shift_type: config.shift_type,
  site_start_time: config.site_start_time,
  timezone: config.timezone,
  default_ot_hours: config.default_ot_hours || null,
  default_ot_start_local_time: config.default_ot_start_local_time || null,
  // ... other config fields
}, null, 2)}
            </pre>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            This configuration is stored in your Supabase <code>roster_config</code> table and 
            automatically applied when creating OT assignments.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OTSettingsExample;
