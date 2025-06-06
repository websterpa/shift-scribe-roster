
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface ComplianceData {
  staffId: string;
  staffName: string;
  currentAverage: number;
  weeksAnalyzed: number;
  optedOut: boolean;
  status: 'compliant' | 'at-risk' | 'non-compliant';
  recommendations: string[];
}

interface ComplianceDashboardProps {
  complianceData: ComplianceData[];
  loading?: boolean;
}

export function ComplianceDashboard({ complianceData, loading = false }: ComplianceDashboardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            WTD Compliance Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalStaff = complianceData.length;
  const compliantStaff = complianceData.filter(d => d.status === 'compliant').length;
  const atRiskStaff = complianceData.filter(d => d.status === 'at-risk').length;
  const nonCompliantStaff = complianceData.filter(d => d.status === 'non-compliant').length;
  const optedOutStaff = complianceData.filter(d => d.optedOut).length;

  const compliancePercentage = totalStaff > 0 ? (compliantStaff / totalStaff) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Compliant</p>
                <p className="text-2xl font-bold text-green-600">{compliantStaff}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">At Risk</p>
                <p className="text-2xl font-bold text-yellow-600">{atRiskStaff}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Non-Compliant</p>
                <p className="text-2xl font-bold text-red-600">{nonCompliantStaff}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Opted Out</p>
                <p className="text-2xl font-bold text-blue-600">{optedOutStaff}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Compliance Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Compliance Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Compliance Rate</span>
              <span>{compliancePercentage.toFixed(1)}%</span>
            </div>
            <Progress value={compliancePercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {compliantStaff} of {totalStaff} staff members are compliant with WTD regulations
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Staff Details */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Compliance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {complianceData.map((staff) => (
              <div key={staff.staffId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{staff.staffName}</h4>
                  <div className="flex items-center gap-2">
                    {staff.optedOut && (
                      <Badge variant="outline" className="text-blue-600 border-blue-600">
                        Opted Out
                      </Badge>
                    )}
                    <Badge 
                      variant={
                        staff.status === 'compliant' ? 'default' :
                        staff.status === 'at-risk' ? 'secondary' : 'destructive'
                      }
                    >
                      {staff.status === 'compliant' ? 'Compliant' :
                       staff.status === 'at-risk' ? 'At Risk' : 'Non-Compliant'}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">17-week average:</span>
                    <span className="ml-2 font-medium">
                      {staff.currentAverage.toFixed(1)}h/week
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Weeks analyzed:</span>
                    <span className="ml-2 font-medium">
                      {staff.weeksAnalyzed}/17
                    </span>
                  </div>
                </div>

                {staff.recommendations.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Recommendations:
                    </p>
                    <ul className="text-sm space-y-1">
                      {staff.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-muted-foreground">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
