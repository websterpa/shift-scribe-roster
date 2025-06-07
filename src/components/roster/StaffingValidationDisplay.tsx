
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, AlertTriangle, Lightbulb, Users } from 'lucide-react';
import { StaffingValidationReport } from '@/utils/roster/staffingValidation';

interface StaffingValidationDisplayProps {
  report: StaffingValidationReport | null;
  isLoading?: boolean;
}

export const StaffingValidationDisplay = ({ report, isLoading }: StaffingValidationDisplayProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Validating Staffing Requirements...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Checking staff availability...</div>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <Card className={`border-2 ${report.isValid ? 'border-green-200' : 'border-red-200'}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staffing Validation Report
          </div>
          <Badge variant={report.isValid ? 'default' : 'destructive'}>
            {report.isValid ? 'Valid' : 'Invalid'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Staff Summary */}
        <div className="grid grid-cols-3 gap-4 p-3 bg-muted rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold">{report.totalStaff}</div>
            <div className="text-xs text-muted-foreground">Total Staff</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{report.shiftWorkers}</div>
            <div className="text-xs text-muted-foreground">Shift Workers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{report.supervisors}</div>
            <div className="text-xs text-muted-foreground">Supervisors</div>
          </div>
        </div>

        {/* Shift Requirements */}
        <div>
          <h4 className="font-medium mb-2">Shift Requirements Analysis</h4>
          <div className="space-y-2">
            {Object.entries(report.shiftRequirements).map(([shiftName, req]) => (
              <div key={shiftName} className={`p-3 rounded-lg border ${req.isAdequate ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{shiftName} Shift</span>
                  <div className="flex items-center gap-2">
                    {req.isAdequate ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <Badge variant={req.isAdequate ? 'default' : 'destructive'} className="text-xs">
                      {req.available}/{req.required}
                    </Badge>
                  </div>
                </div>
                
                {req.shortfall > 0 && (
                  <div className="text-sm text-red-600 mb-2">
                    Shortfall: {req.shortfall} staff member{req.shortfall > 1 ? 's' : ''}
                  </div>
                )}
                
                {req.eligible.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Eligible: {req.eligible.map(s => `${s.first_name} ${s.last_name}`).join(', ')}
                  </div>
                )}
                
                {req.available === 0 && (
                  <div className="text-xs text-red-600 mt-1">
                    ❌ No staff eligible for this shift
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Errors */}
        {report.errors.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 text-red-600">Critical Issues</h4>
            <div className="space-y-2">
              {report.errors.map((error, index) => (
                <Alert key={index} variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {report.warnings.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 text-yellow-600">Warnings</h4>
            <div className="space-y-2">
              {report.warnings.map((warning, index) => (
                <Alert key={index} className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">{warning}</AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 text-blue-600">Recommendations</h4>
            <div className="space-y-2">
              {report.recommendations.map((rec, index) => (
                <Alert key={index} className="border-blue-200 bg-blue-50">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">{rec}</AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
