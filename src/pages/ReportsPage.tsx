
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, DollarSign, TrendingUp, Users, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardStats } from '@/components/roster/DashboardStats';
import { RosterHeatmap } from '@/components/roster/RosterHeatmap';
import { StaffUtilizationDashboard } from '@/components/roster/StaffUtilizationDashboard';

const ReportsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
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

      {/* Quick Stats Overview */}
      <DashboardStats />

      {/* Main Content with Tabs */}
      <Tabs defaultValue="cost" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
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
                    <div className="text-2xl font-bold">£12,500</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Allocated for this month
                    </p>
                    <div className="mt-2">
                      <Badge variant="secondary">68% Used</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Actual Spend */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Actual Spend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">£8,450</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current month to date
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Badge variant="outline">Regular: £6,200</Badge>
                      <Badge variant="outline">Overtime: £2,250</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Variance */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Budget Variance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">£4,050</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Under budget
                    </p>
                    <div className="mt-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        32% Under
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
                    { role: 'CCTV Operator', hours: 340, cost: 5100, rate: 15.00 },
                    { role: 'Senior Operator', hours: 180, cost: 3150, rate: 17.50 },
                    { role: 'Supervisor', hours: 45, cost: 1125, rate: 25.00 }
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
                        <p className="text-sm text-muted-foreground">{Math.round((item.cost / 8450) * 100)}% of total</p>
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
      </Tabs>
    </div>
  );
};

export default ReportsPage;
