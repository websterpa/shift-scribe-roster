import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, DollarSign, TrendingUp, Users, Clock, AlertTriangle, CheckCircle, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardStats } from '@/components/roster/DashboardStats';
import { RosterHeatmap } from '@/components/roster/RosterHeatmap';
import { StaffUtilizationDashboard } from '@/components/roster/StaffUtilizationDashboard';
import { AuditLog } from '@/components/roster/AuditLog';
import { useReportsData } from '@/hooks/useReportsData';

const ReportsPage = () => {
  const navigate = useNavigate();
  const { data: reportsData, loading, error } = useReportsData();

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading reports data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center p-8">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Reports</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-muted-foreground">
              Comprehensive insights into your roster performance and compliance
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/reports/archived-rosters')}
          className="flex items-center gap-2"
        >
          <Archive className="h-4 w-4" />
          Archived Rosters
        </Button>
      </div>

      {/* Quick Stats Overview */}
      <DashboardStats 
        coverageGap={2}
        overtimeStaff={[
          { name: 'John Smith', hours: 42 },
          { name: 'Sarah Jones', hours: 44 },
          { name: 'Mike Wilson', hours: 41 }
        ]}
        costVariance={{
          current: reportsData.totalCost,
          budget: reportsData.totalCost - reportsData.budgetVariance,
          variance: reportsData.budgetVariance
        }}
        complianceAlerts={3}
      />

      {/* Main Content with Tabs */}
      <Tabs defaultValue="cost" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cost" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Cost Analysis
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Compliance Overview
          </TabsTrigger>
          <TabsTrigger value="utilization" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Utilization Trends
          </TabsTrigger>
          <TabsTrigger value="corrections" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Corrections History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cost" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Labor Cost Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Monthly Budget */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Budget</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">£{(reportsData.totalCost - reportsData.budgetVariance).toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Allocated for this month
                    </p>
                    <div className="mt-2">
                      <Badge variant="secondary">
                        {Math.round((reportsData.totalCost / (reportsData.totalCost - reportsData.budgetVariance)) * 100)}% Used
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Actual Spend */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Actual Spend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">£{reportsData.totalCost.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current month to date
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Badge variant="outline">Regular: £{(reportsData.totalCost * 0.75).toLocaleString()}</Badge>
                      <Badge variant="outline">Overtime: £{(reportsData.totalCost * 0.25).toLocaleString()}</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Variance */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Budget Variance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${reportsData.budgetVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {reportsData.budgetVariance > 0 ? '+' : ''}£{Math.abs(reportsData.budgetVariance).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {reportsData.budgetVariance > 0 ? 'Over budget' : 'Under budget'}
                    </p>
                    <div className="mt-2">
                      <Badge variant="secondary" className={reportsData.budgetVariance > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                        {Math.round(Math.abs(reportsData.budgetVariance) / (reportsData.totalCost - reportsData.budgetVariance) * 100)}% {reportsData.budgetVariance > 0 ? 'Over' : 'Under'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Cost Breakdown Chart */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Cost Breakdown by Role</h3>
                <div className="space-y-3">
                  {[
                    { role: 'CCTV Operator', hours: Math.round(reportsData.averageHoursPerWeek * 3), cost: Math.round(reportsData.totalCost * 0.6), rate: 15.00 },
                    { role: 'Senior Operator', hours: Math.round(reportsData.averageHoursPerWeek * 1.5), cost: Math.round(reportsData.totalCost * 0.25), rate: 17.50 },
                    { role: 'Supervisor', hours: Math.round(reportsData.averageHoursPerWeek * 0.5), cost: Math.round(reportsData.totalCost * 0.15), rate: 25.00 }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{item.role}</p>
                          <p className="text-sm text-muted-foreground">{item.hours} hours @ £{item.rate}/hr</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">£{item.cost.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{Math.round((item.cost / reportsData.totalCost) * 100)}% of total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Working Time Directive Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Overall Compliance */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Overall Compliance Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600 mb-2">94%</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>48-hour week limit</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">✓</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>11-hour rest periods</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">✓</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Weekly rest periods</span>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">⚠</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Night work limits</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">✓</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Violations */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Violations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-600 mb-3">3</div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 p-2 bg-amber-50 rounded">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium">Insufficient rest period</p>
                          <p className="text-muted-foreground">John Doe - June 15th</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-2 bg-amber-50 rounded">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium">Weekly hours exceeded</p>
                          <p className="text-muted-foreground">Jane Smith - Week 24</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-2 bg-amber-50 rounded">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium">Consecutive night shifts</p>
                          <p className="text-muted-foreground">Mike Johnson - June 18-20</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Compliance Trends */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Compliance Trends</h3>
                <RosterHeatmap />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="utilization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Staff Utilization & Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StaffUtilizationDashboard />
            </CardContent>
          </Card>

          {/* Additional Utilization Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all staff members
                </p>
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">+3% vs last month</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overtime Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">142</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total this month
                </p>
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">+18 vs target</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Coverage Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">96%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Required shifts covered
                </p>
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">Target: 95%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="corrections" className="space-y-6">
          <AuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
