
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, DollarSign, Shield, Star } from 'lucide-react';

interface DashboardStatsProps {
  coverageGap?: number;
  overtimeStaff?: Array<{ name: string; hours: number }>;
  costVariance?: { current: number; budget: number; variance: number };
  complianceAlerts?: number;
  customPatterns?: number;
}

export function DashboardStats({
  coverageGap = 2,
  overtimeStaff = [
    { name: 'John Smith', hours: 42 },
    { name: 'Sarah Jones', hours: 44 },
    { name: 'Mike Wilson', hours: 41 }
  ],
  costVariance = { current: 8450, budget: 8000, variance: 450 },
  complianceAlerts = 3,
  customPatterns = 0
}: DashboardStatsProps) {
  const formatCurrency = (amount: number) => `£${amount.toLocaleString()}`;
  const getVarianceColor = (variance: number) => variance > 0 ? 'text-red-600' : 'text-green-600';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* Coverage Gap Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Coverage Gap</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{coverageGap}</div>
          <p className="text-xs text-muted-foreground">
            Current hour's demand vs. staffed count shows a shortage
          </p>
          <div className="mt-2">
            <Badge variant={coverageGap > 0 ? "destructive" : "secondary"}>
              {coverageGap > 0 ? `${coverageGap} understaffed` : 'Fully covered'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Overtime Risk Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overtime Risk</CardTitle>
          <Clock className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">{overtimeStaff.length}</div>
          <p className="text-xs text-muted-foreground">
            Staff members approaching or exceeding 40 hours this week
          </p>
          <div className="mt-2 space-y-1">
            {overtimeStaff.slice(0, 2).map((staff, index) => (
              <div key={index} className="text-xs flex justify-between">
                <span className="truncate">{staff.name}</span>
                <span className="font-medium">{staff.hours}h</span>
              </div>
            ))}
            {overtimeStaff.length > 2 && (
              <div className="text-xs text-muted-foreground">
                +{overtimeStaff.length - 2} more
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cost Variance Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cost Variance</CardTitle>
          <DollarSign className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getVarianceColor(costVariance.variance)}`}>
            {costVariance.variance > 0 ? '+' : ''}{formatCurrency(costVariance.variance)}
          </div>
          <p className="text-xs text-muted-foreground">
            This month's spend vs. budget shows {costVariance.variance > 0 ? 'overspend' : 'savings'}
          </p>
          <div className="mt-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span>Current:</span>
              <span className="font-medium">{formatCurrency(costVariance.current)}</span>
            </div>
            <div className="flex justify-between">
              <span>Budget:</span>
              <span className="font-medium">{formatCurrency(costVariance.budget)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Patterns Card - NEW */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-emerald-700">Custom Patterns</CardTitle>
          <Star className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">{customPatterns}</div>
          <p className="text-xs text-emerald-600">
            Saved shift patterns ready for roster generation
          </p>
          <div className="mt-2">
            <Badge 
              variant="outline" 
              className="border-emerald-300 text-emerald-700 bg-emerald-100"
            >
              {customPatterns > 0 ? 'Patterns ready' : 'Create patterns'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Alerts Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Compliance Alerts</CardTitle>
          <Shield className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{complianceAlerts}</div>
          <p className="text-xs text-muted-foreground">
            Active Working Time Directive violations requiring attention
          </p>
          <div className="mt-2">
            <Badge variant={complianceAlerts > 0 ? "destructive" : "secondary"}>
              {complianceAlerts > 0 ? `${complianceAlerts} violations` : 'Compliant'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
