import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Users, 
  DollarSign, 
  Clock, 
  Calendar,
  TrendingUp,
  Eye,
  Moon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RosterGenerationResultUI } from '@/features/roster/types';

interface RosterResultsSummaryProps {
  result: RosterGenerationResultUI;
}

export const RosterResultsSummary: React.FC<RosterResultsSummaryProps> = ({ result }) => {
  const navigate = useNavigate();

  // Temporary diagnostic logging
  console.log('✓ RosterResultsSummary received diagnostics:', result.diagnostics);

  const handleViewRoster = () => {
    if (result.generatedVersionId) {
      navigate(`/roster/${result.generatedVersionId}`);
    }
  };

  const getViolationSeverity = (violations: string[]) => {
    if (violations.length === 0) return 'success';
    if (violations.length <= 3) return 'warning';
    return 'error';
  };

  const getCoverageStatus = (coverage: number) => {
    if (coverage >= 95) return { color: 'success', icon: CheckCircle };
    if (coverage >= 85) return { color: 'warning', icon: AlertTriangle };
    return { color: 'destructive', icon: XCircle };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const coverage = result.coverageAchieved.total;
  const coverageStatus = getCoverageStatus(coverage);
  const CoverageIcon = coverageStatus.icon;
  const violationSeverity = getViolationSeverity(result.violations);

  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Roster Generation Results
          </div>
          {result.generatedVersionId && (
            <Button onClick={handleViewRoster} variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Roster
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Coverage Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Coverage Achieved</p>
                  <p className="text-2xl font-bold">{coverage.toFixed(1)}%</p>
                </div>
                <CoverageIcon className={`h-8 w-8 ${
                  coverageStatus.color === 'success' ? 'text-green-500' :
                  coverageStatus.color === 'warning' ? 'text-yellow-500' : 'text-red-500'
                }`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="text-2xl font-bold">{formatCurrency(result.cost.total)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-500" />
              </div>
              {result.cost.budgetVariance !== undefined && (
                <div className="mt-2">
                  <Badge 
                    variant={result.cost.budgetVariance <= 0 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {result.cost.budgetVariance > 0 ? '+' : ''}
                    {formatCurrency(result.cost.budgetVariance)} vs budget
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Violations</p>
                  <p className="text-2xl font-bold">{result.violations.length}</p>
                </div>
                {violationSeverity === 'success' ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : violationSeverity === 'warning' ? (
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-500" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fairness Score</p>
                  <p className="text-2xl font-bold">
                    {Math.round(
                      ((result.fairnessStats.nights.max - result.fairnessStats.nights.min) <= 2 ? 25 : 0) +
                      ((result.fairnessStats.weekends.max - result.fairnessStats.weekends.min) <= 1 ? 25 : 0) +
                      ((result.fairnessStats.publicHolidays.max - result.fairnessStats.publicHolidays.min) <= 1 ? 25 : 0) +
                      (coverage >= 95 ? 25 : coverage >= 85 ? 15 : 5)
                    )}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Coverage by Shift */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Coverage by Shift Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(result.coverageAchieved.byShift).map(([shiftType, percentage]) => (
                <div key={shiftType} className="text-center">
                  <div className="text-sm text-muted-foreground capitalize">{shiftType} Shift</div>
                  <div className="text-xl font-semibold">{percentage.toFixed(1)}%</div>
                  <Badge 
                    variant={percentage >= 95 ? "default" : percentage >= 85 ? "secondary" : "destructive"}
                    className="text-xs mt-1"
                  >
                    {percentage >= 95 ? 'Excellent' : percentage >= 85 ? 'Good' : 'Needs Attention'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Fairness Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Fairness Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Night Shifts */}
              <div className="space-y-2">
                <h4 className="font-medium">Night Shifts</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Minimum:</span>
                    <span className="font-medium">{result.fairnessStats.nights.min}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average:</span>
                    <span className="font-medium">{result.fairnessStats.nights.avg.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Maximum:</span>
                    <span className="font-medium">{result.fairnessStats.nights.max}</span>
                  </div>
                  <Badge 
                    variant={(result.fairnessStats.nights.max - result.fairnessStats.nights.min) <= 2 ? "default" : "secondary"}
                    className="text-xs mt-1"
                  >
                    Variance: {result.fairnessStats.nights.max - result.fairnessStats.nights.min}
                  </Badge>
                </div>
              </div>

              {/* Weekend Shifts */}
              <div className="space-y-2">
                <h4 className="font-medium">Weekend Shifts</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Minimum:</span>
                    <span className="font-medium">{result.fairnessStats.weekends.min}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average:</span>
                    <span className="font-medium">{result.fairnessStats.weekends.avg.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Maximum:</span>
                    <span className="font-medium">{result.fairnessStats.weekends.max}</span>
                  </div>
                  <Badge 
                    variant={(result.fairnessStats.weekends.max - result.fairnessStats.weekends.min) <= 1 ? "default" : "secondary"}
                    className="text-xs mt-1"
                  >
                    Variance: {result.fairnessStats.weekends.max - result.fairnessStats.weekends.min}
                  </Badge>
                </div>
              </div>

              {/* Public Holidays */}
              <div className="space-y-2">
                <h4 className="font-medium">Public Holidays</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Minimum:</span>
                    <span className="font-medium">{result.fairnessStats.publicHolidays.min}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average:</span>
                    <span className="font-medium">{result.fairnessStats.publicHolidays.avg.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Maximum:</span>
                    <span className="font-medium">{result.fairnessStats.publicHolidays.max}</span>
                  </div>
                  <Badge 
                    variant={(result.fairnessStats.publicHolidays.max - result.fairnessStats.publicHolidays.min) <= 1 ? "default" : "secondary"}
                    className="text-xs mt-1"
                  >
                    Variance: {result.fairnessStats.publicHolidays.max - result.fairnessStats.publicHolidays.min}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Distribution Diagnostics - NEW */}
        {(() => {
          const dist = result.diagnostics?.distributionStats;
          const byStaff = Array.isArray(dist?.byStaff) ? dist.byStaff : [];
          const byShiftCode = dist?.byShiftCode ?? {};
          
          if (byStaff.length === 0 && Object.keys(byShiftCode).length === 0) {
            return null;
          }

          const nightValues = byStaff.map(s => s.nights).filter((n): n is number => n !== undefined);
          const weekendValues = byStaff.map(s => s.weekendDays).filter((n): n is number => n !== undefined);
          const hoursValues = byStaff.map(s => s.totalHours).filter((n): n is number => n !== undefined);

          return (
            <Card key="distribution-balance">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Moon className="h-5 w-5" />
                  Distribution Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {nightValues.length > 0 && (
                    <div>
                      <div className="text-muted-foreground">Nights Range</div>
                      <div className="font-medium">
                        {Math.min(...nightValues)} - {Math.max(...nightValues)}
                      </div>
                    </div>
                  )}
                  {weekendValues.length > 0 && (
                    <div>
                      <div className="text-muted-foreground">Weekend Days Range</div>
                      <div className="font-medium">
                        {Math.min(...weekendValues)} - {Math.max(...weekendValues)}
                      </div>
                    </div>
                  )}
                  {hoursValues.length > 0 && (
                    <div>
                      <div className="text-muted-foreground">Hours Range</div>
                      <div className="font-medium">
                        {Math.min(...hoursValues)}h - {Math.max(...hoursValues)}h
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Constraint Violations */}
        {(() => {
          const violations = result.diagnostics?.constraintViolations;
          if (!violations || Object.keys(violations).length === 0) {
            return null;
          }
          
          return (
            <Card className="border-yellow-200 bg-yellow-50/50" key="constraint-violations">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Constraint Violations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(violations).map(([constraint, count]) => (
                    <div key={constraint} className="flex items-center justify-between p-2 bg-yellow-100 rounded">
                      <span className="text-sm text-yellow-700 capitalize">
                        {constraint.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                        {count} occurrence{count !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Violations */}
        {result.violations.length > 0 && (
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Compliance Violations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.violations.map((violation, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-red-100 rounded">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-red-700">{violation}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Message */}
        {result.violations.length === 0 && coverage >= 95 && (
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">
                  Excellent! Your roster meets all compliance requirements with optimal coverage.
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};