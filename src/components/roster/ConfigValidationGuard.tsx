/**
 * ConfigValidationGuard - Blocks generation when config drift is detected
 * Integrates checkConfig to enforce consistency between Feasibility and Builder
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, XCircle, Info } from 'lucide-react';
import type { ConsistencyIssue } from '@/utils/consistency/checkConfig';

interface ConfigValidationGuardProps {
  issues: ConsistencyIssue[];
}

export function ConfigValidationGuard({ issues }: ConfigValidationGuardProps) {
  if (issues.length === 0) return null;

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warn');
  const infos = issues.filter(i => i.severity === 'info');

  const hasBlockingErrors = errors.length > 0;

  return (
    <Card className="border-red-500 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-900">
          <XCircle className="h-5 w-5" />
          Configuration Validation Failed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasBlockingErrors && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Blocking Errors Detected</AlertTitle>
            <AlertDescription>
              Generation is blocked until these errors are resolved. Return to Feasibility Calculator to fix configuration.
            </AlertDescription>
          </Alert>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="font-semibold">
                {errors.length} Error{errors.length > 1 ? 's' : ''}
              </Badge>
            </div>
            {errors.map((issue, idx) => (
              <div key={idx} className="bg-red-100 border border-red-300 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-700 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-900 text-sm">{issue.message}</p>
                    {issue.details && (
                      <p className="text-xs text-red-800 mt-1">{issue.details}</p>
                    )}
                    {issue.path && (
                      <p className="text-xs text-red-600 mt-1 font-mono">{issue.path}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-semibold border-orange-500 text-orange-700">
                {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
              </Badge>
            </div>
            {warnings.map((issue, idx) => (
              <div key={idx} className="bg-orange-50 border border-orange-300 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-700 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-orange-900 text-sm">{issue.message}</p>
                    {issue.details && (
                      <p className="text-xs text-orange-800 mt-1">{issue.details}</p>
                    )}
                    {issue.path && (
                      <p className="text-xs text-orange-600 mt-1 font-mono">{issue.path}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        {infos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-semibold border-blue-500 text-blue-700">
                {infos.length} Info
              </Badge>
            </div>
            {infos.map((issue, idx) => (
              <div key={idx} className="bg-blue-50 border border-blue-300 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-700 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900 text-sm">{issue.message}</p>
                    {issue.details && (
                      <p className="text-xs text-blue-800 mt-1">{issue.details}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
