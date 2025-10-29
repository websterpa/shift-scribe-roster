
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useStaffData } from '@/hooks/useStaffData';
import { 
  analyzeStaffUtilization, 
  UtilizationAnalysisReport,
  StaffUtilizationMetrics
} from '@/services/roster/helpers';
import { toast } from '@/hooks/use-toast';

export function StaffUtilizationDashboard() {
  const { staffMembers, loading: staffLoading } = useStaffData();
  const [analysisReport, setAnalysisReport] = useState<UtilizationAnalysisReport | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisDateRange, setAnalysisDateRange] = useState({
    startDate: new Date(Date.now() - 17 * 7 * 24 * 60 * 60 * 1000), // 17 weeks ago
    endDate: new Date()
  });

  const runAnalysis = async () => {
    if (staffMembers.length === 0) {
      toast({
        title: "No staff data",
        description: "Please add staff members before running utilization analysis",
        variant: "destructive"
      });
      return;
    }

    setAnalyzing(true);
    try {
      const report = await analyzeStaffUtilization(
        staffMembers,
        analysisDateRange.startDate,
        analysisDateRange.endDate
      );
      setAnalysisReport(report);
      toast({
        title: "Analysis complete",
        description: `Analyzed ${report.totalStaff} staff members over ${Math.ceil((analysisDateRange.endDate.getTime() - analysisDateRange.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))} weeks`
      });
    } catch (error: any) {
      console.error('Failed to run utilization analysis:', error);
      toast({
        title: "Analysis failed",
        description: error?.message || "Failed to analyze staff utilization",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!staffLoading && staffMembers.length > 0) {
      runAnalysis();
    }
  }, [staffLoading, staffMembers.length]);

  const getStatusColor = (status: StaffUtilizationMetrics['status']) => {
    switch (status) {
      case 'underutilized': return 'destructive';
      case 'optimal': return 'default';
      case 'overutilized': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: StaffUtilizationMetrics['status']) => {
    switch (status) {
      case 'underutilized': return <TrendingDown className="h-4 w-4" />;
      case 'optimal': return <CheckCircle className="h-4 w-4" />;
      case 'overutilized': return <TrendingUp className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (staffLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading staff data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Staff Utilization Analysis</h2>
          <p className="text-muted-foreground">
            Monitor staff working hours against minimum requirements
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={analyzing}>
          {analyzing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Analysis
            </>
          )}
        </Button>
      </div>

      {analysisReport && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analysisReport.totalStaff}</div>
                <p className="text-xs text-muted-foreground">
                  Shift workers analyzed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Underutilized</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {analysisReport.underutilizedStaff}
                </div>
                <p className="text-xs text-muted-foreground">
                  Below minimum hours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Utilization</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analysisReport.averageUtilization.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Of minimum requirements
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hour Deficit</CardTitle>
                <Clock className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {analysisReport.totalHourDeficit.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Hours below minimum
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          {analysisReport.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysisReport.recommendations.map((recommendation, index) => (
                    <Alert key={index}>
                      <AlertDescription>{recommendation}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Staff Details */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Staff Utilization</CardTitle>
              <CardDescription>
                Detailed breakdown of each staff member's working hours vs minimum requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysisReport.staffMetrics.map((staff) => (
                  <div key={staff.staffId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{staff.staffName}</h4>
                        <Badge variant={getStatusColor(staff.status)} className="flex items-center gap-1">
                          {getStatusIcon(staff.status)}
                          {staff.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {staff.utilizationPercentage.toFixed(1)}% utilization
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Hours/Week</p>
                        <p className="font-medium">
                          {staff.actualHoursPerWeek.toFixed(1)} / {staff.minHoursPerWeek}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Worked</p>
                        <p className="font-medium">{staff.totalHoursWorked.toFixed(1)} hrs</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Deficit</p>
                        <p className="font-medium text-destructive">
                          {staff.hourlyDeficit > 0 ? `${staff.hourlyDeficit.toFixed(1)} hrs` : 'None'}
                        </p>
                      </div>
                    </div>
                    
                    <Progress 
                      value={Math.min(staff.utilizationPercentage, 150)} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
