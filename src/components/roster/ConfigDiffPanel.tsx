import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { RequirementsV2 } from '@/types/requirementsV2';

interface ConfigDiffPanelProps {
  savedConfig: RequirementsV2 | null;
  builderState: RequirementsV2 | null;
}

interface DiffItem {
  dayType: 'weekdays' | 'saturday' | 'sunday';
  shift: string;
  saved: number;
  builder: number;
  match: boolean;
}

export function ConfigDiffPanel({ savedConfig, builderState }: ConfigDiffPanelProps) {
  // Only show in development
  const isDev = import.meta.env.DEV;
  if (!isDev) return null;

  const diffs = useMemo<DiffItem[]>(() => {
    if (!savedConfig || !builderState) return [];
    if (savedConfig.framework !== builderState.framework) return [];

    const items: DiffItem[] = [];
    const shifts = savedConfig.framework === '8h' ? ['E', 'L', 'N'] : ['D', 'N'];
    const dayTypes: Array<'weekdays' | 'saturday' | 'sunday'> = ['weekdays', 'saturday', 'sunday'];

    dayTypes.forEach(dayType => {
      shifts.forEach(shift => {
        const saved = (savedConfig.days[dayType] as any)[shift] || 0;
        const builder = (builderState.days[dayType] as any)[shift] || 0;
        items.push({
          dayType,
          shift,
          saved,
          builder,
          match: saved === builder,
        });
      });
    });

    return items;
  }, [savedConfig, builderState]);

  if (!savedConfig || !builderState) {
    return (
      <Card className="border-orange-300 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
              DEV
            </Badge>
            Config Diff
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No config to compare yet</p>
        </CardContent>
      </Card>
    );
  }

  if (savedConfig.framework !== builderState.framework) {
    return (
      <Card className="border-orange-300 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
              DEV
            </Badge>
            Config Diff
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-red-600">
            Framework mismatch: {savedConfig.framework} (saved) vs {builderState.framework} (builder)
          </p>
        </CardContent>
      </Card>
    );
  }

  const allMatch = diffs.every(d => d.match);
  const mismatchCount = diffs.filter(d => !d.match).length;

  return (
    <Card className="border-orange-300 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
              DEV
            </Badge>
            Config Diff
          </div>
          {allMatch ? (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              ✓ All Match
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
              {mismatchCount} Mismatch{mismatchCount > 1 ? 'es' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {(['weekdays', 'saturday', 'sunday'] as const).map(dayType => (
            <div key={dayType} className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase">
                {dayType}
              </div>
              <div className="grid gap-1">
                {diffs
                  .filter(d => d.dayType === dayType)
                  .map((diff, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                        diff.match ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <span className="font-medium">{diff.shift}:</span>
                      {diff.match ? (
                        <div className="flex items-center gap-1 text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{diff.saved}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-700">
                          <XCircle className="h-3 w-3" />
                          <span>Saved: {diff.saved}</span>
                          <span>→</span>
                          <span>Builder: {diff.builder}</span>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
