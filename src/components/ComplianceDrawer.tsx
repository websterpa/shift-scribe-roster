
import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, AlertTriangle, CheckCircle, Clock, TrendingUp, DollarSign, Users, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ComplianceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rosterId?: string;
}

interface ComplianceStatus {
  isCompliant: boolean;
  score: number;
  violations: string[];
  lastChecked: Date;
}

interface KPI {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'danger';
  icon: React.ComponentType<{ className?: string }>;
  change?: string;
}

const WTD_RULES = [
  {
    rule: "Maximum 48 hours per week",
    description: "Workers cannot exceed an average of 48 hours per week over a 17-week reference period",
    status: "compliant" as const
  },
  {
    rule: "Minimum 11 hours rest between shifts",
    description: "Workers must have at least 11 consecutive hours of rest in each 24-hour period",
    status: "compliant" as const
  },
  {
    rule: "Minimum 24 hours rest per week",
    description: "Workers must have at least 24 hours of uninterrupted rest in each 7-day period",
    status: "warning" as const
  },
  {
    rule: "Maximum 8 hours night work",
    description: "Night workers should not work more than 8 hours in any 24-hour period",
    status: "compliant" as const
  },
  {
    rule: "4 weeks annual leave minimum",
    description: "Workers are entitled to at least 4 weeks of paid annual leave",
    status: "compliant" as const
  }
];

export function ComplianceDrawer({ isOpen, onClose, rosterId }: ComplianceDrawerProps) {
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && rosterId) {
      checkCompliance();
    }
  }, [isOpen, rosterId]);

  const checkCompliance = async () => {
    console.log('🔍 ComplianceDrawer: Checking compliance for roster:', rosterId);
    setIsChecking(true);
    
    try {
      // Simulate compliance check - in real app, this would call your compliance checking logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock compliance status
      const mockStatus: ComplianceStatus = {
        isCompliant: Math.random() > 0.3,
        score: Math.floor(Math.random() * 30) + 70, // 70-100
        violations: Math.random() > 0.5 ? [] : [
          "Staff member John Doe has only 9 hours rest between shifts on 2025-06-15",
          "Weekly hours for Jane Smith exceed 48 hours in week 24"
        ],
        lastChecked: new Date()
      };
      
      setComplianceStatus(mockStatus);
      console.log('✅ ComplianceDrawer: Compliance check completed:', mockStatus);
      
    } catch (error) {
      console.error('❌ ComplianceDrawer: Error checking compliance:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const kpis: KPI[] = [
    {
      label: "Coverage Gap",
      value: "2.3%",
      status: "warning",
      icon: Users,
      change: "+0.5%"
    },
    {
      label: "Overtime Risk",
      value: "High",
      status: "danger",
      icon: Clock,
      change: "↑ from Medium"
    },
    {
      label: "Cost Variance",
      value: "+£1,250",
      status: "warning",
      icon: DollarSign,
      change: "+8.2%"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'good':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'danger':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'good':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
      case 'danger':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Compliance & Reports
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* WTD Compliance Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>WTD Compliance</span>
                {complianceStatus && (
                  <Badge variant={complianceStatus.isCompliant ? "default" : "destructive"}>
                    {complianceStatus.isCompliant ? "Compliant" : "Issues Found"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rosterId ? (
                <>
                  {isChecking ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Checking compliance...</p>
                    </div>
                  ) : complianceStatus ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Compliance Score</span>
                        <span className={`text-lg font-bold ${complianceStatus.score >= 90 ? 'text-green-600' : complianceStatus.score >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {complianceStatus.score}%
                        </span>
                      </div>
                      
                      {complianceStatus.violations.length > 0 && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-1">
                              <p className="font-medium">{complianceStatus.violations.length} violations found:</p>
                              <ul className="text-sm space-y-1">
                                {complianceStatus.violations.map((violation, index) => (
                                  <li key={index} className="text-muted-foreground">• {violation}</li>
                                ))}
                              </ul>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        Last checked: {complianceStatus.lastChecked.toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <Button onClick={checkCompliance} variant="outline" className="w-full">
                      Run Compliance Check
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No roster selected. Generate a roster to check compliance.
                </p>
              )}
              
              <Collapsible open={showRules} onOpenChange={setShowRules}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    Working Time Directive Rules
                    <ChevronDown className={`h-4 w-4 transition-transform ${showRules ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {WTD_RULES.map((rule, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className={`p-1 rounded ${getStatusColor(rule.status)}`}>
                          {getStatusIcon(rule.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{rule.rule}</p>
                          <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Quick KPIs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick KPIs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {kpis.map((kpi, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${getStatusColor(kpi.status)}`}>
                      <kpi.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{kpi.label}</p>
                      {kpi.change && (
                        <p className="text-xs text-muted-foreground">{kpi.change}</p>
                      )}
                    </div>
                  </div>
                  <span className={`font-bold ${
                    kpi.status === 'good' ? 'text-green-600' :
                    kpi.status === 'warning' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {kpi.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              onClick={() => {
                navigate('/reports');
                onClose();
              }}
              className="w-full"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              View Full Reports
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
            
            {rosterId && complianceStatus && !complianceStatus.isCompliant && (
              <Button variant="outline" className="w-full">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Generate Compliance Report
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
