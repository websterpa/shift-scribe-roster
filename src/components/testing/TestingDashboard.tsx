
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { runAllOverstaffingTests } from '../../utils/testing/overstaffingTests';
import { RosterSafeguards } from '../../utils/testing/safeguards';
import { AlertCircle, CheckCircle, Clock, Users } from 'lucide-react';

export const TestingDashboard = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [safeguardStats, setSafeguardStats] = useState(RosterSafeguards.getOperationStats());

  const runTests = async () => {
    setIsRunning(true);
    try {
      console.log('🧪 Starting comprehensive testing suite...');
      const results = runAllOverstaffingTests();
      setTestResults(results);
      setSafeguardStats(RosterSafeguards.getOperationStats());
    } catch (error) {
      console.error('Testing failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getTestStatusIcon = (result: any) => {
    if (!result.success) return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getTestStatusBadge = (result: any) => {
    if (!result.success) return <Badge variant="destructive">Failed</Badge>;
    
    const allValidationsPassed = result.validations && 
      result.validations.overstaffingDetected && 
      result.validations.minHoursShortfallDetected;
    
    return allValidationsPassed ? 
      <Badge variant="default">Passed</Badge> : 
      <Badge variant="secondary">Partial</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Overstaffing Detection Testing</h2>
        <Button 
          onClick={runTests} 
          disabled={isRunning}
          className="min-w-32"
        >
          {isRunning ? 'Running...' : 'Run Tests'}
        </Button>
      </div>

      {/* Safeguard Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Safety Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{safeguardStats.operationsThisMinute}</div>
              <div className="text-sm text-muted-foreground">Operations This Minute</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{safeguardStats.remainingOperations}</div>
              <div className="text-sm text-muted-foreground">Remaining Operations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{Math.round(safeguardStats.resetIn / 1000)}s</div>
              <div className="text-sm text-muted-foreground">Reset In</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Test Results</h3>
          
          {/* Summary */}
          <Alert>
            <AlertDescription>
              {testResults.filter(r => r.success).length} of {testResults.length} tests passed. 
              Total execution time: {testResults.reduce((sum, r) => sum + r.executionTime, 0)}ms
            </AlertDescription>
          </Alert>

          {/* Individual Results */}
          <div className="grid gap-4">
            {testResults.map((result, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTestStatusIcon(result)}
                      {result.scenario}
                    </div>
                    <div className="flex items-center gap-2">
                      {getTestStatusBadge(result)}
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {result.executionTime}ms
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                
                {result.success && result.metrics && (
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span className="font-medium">Staff Count</span>
                        </div>
                        <div>{result.metrics.totalStaff} (optimal: {result.metrics.optimalStaffCount})</div>
                      </div>
                      
                      <div>
                        <div className="font-medium">Overstaffed</div>
                        <div className={result.metrics.isOverstaffed ? 'text-orange-600' : 'text-green-600'}>
                          {result.metrics.isOverstaffed ? 'Yes' : 'No'}
                        </div>
                      </div>
                      
                      <div>
                        <div className="font-medium">Avg Hours</div>
                        <div className={result.metrics.minHoursShortfall ? 'text-red-600' : 'text-green-600'}>
                          {result.metrics.averageHours} / {result.metrics.expectedMinHours}
                        </div>
                      </div>
                      
                      <div>
                        <div className="font-medium">Below Min Hours</div>
                        <div className={result.metrics.staffBelowMinimum > 0 ? 'text-red-600' : 'text-green-600'}>
                          {result.metrics.staffBelowMinimum} staff
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
                
                {!result.success && (
                  <CardContent>
                    <Alert>
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>
                        Error: {result.error}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
