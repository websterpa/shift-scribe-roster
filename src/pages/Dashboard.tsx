import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Users, 
  Settings, 
  FileText, 
  Star,
  TrendingUp,
  Clock,
  BarChart3,
  Plus,
  Zap,
  Target,
  Brain
} from 'lucide-react';
import { ActionsFAB } from '@/components/ActionsFAB';
import { NewRosterWizard } from '@/components/NewRosterWizard';
import { ComplianceDrawer } from '@/components/ComplianceDrawer';
import { DashboardStats } from '@/components/roster/DashboardStats';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useStaffData } from '@/hooks/useStaffData';
import { toast } from '@/hooks/use-toast';

export default function Dashboard() {
  const [showNewRosterWizard, setShowNewRosterWizard] = useState(false);
  const [showComplianceDrawer, setShowComplianceDrawer] = useState(false);
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { staffMembers } = useStaffData();

  const handleRosterGenerated = (tempConfigId?: string) => {
    setShowNewRosterWizard(false);
    toast({
      title: "Roster Generated",
      description: "Your new roster has been created successfully!",
    });
    navigate('/my-rosters');
  };

  const quickActions = [
    {
      title: 'Generate New Roster',
      description: 'Create a new roster with existing configuration',
      icon: Calendar,
      action: () => navigate('/generate-roster'),
      color: 'bg-blue-500',
      badge: 'Popular'
    },
    {
      title: 'Manage Staff',
      description: 'Add, edit, or remove staff members',
      icon: Users,
      action: () => navigate('/staff'),
      color: 'bg-green-500'
    },
    {
      title: 'Shift Patterns',
      description: 'Create and manage custom shift patterns',
      icon: Star,
      action: () => navigate('/patterns'),
      color: 'bg-purple-500',
      badge: 'Enhanced'
    },
    {
      title: 'Configuration',
      description: 'Set up roster parameters and rules',
      icon: Settings,
      action: () => navigate('/roster-config'),
      color: 'bg-orange-500'
    }
  ];

  const recentActivities = [
    { title: 'Weekly Roster Generated', time: '2 hours ago', icon: Calendar },
    { title: 'Staff Member Added', time: '1 day ago', icon: Users },
    { title: 'Pattern Created', time: '2 days ago', icon: Star },
    { title: 'Configuration Updated', time: '3 days ago', icon: Settings }
  ];

  const insights = [
    {
      title: 'Staffing Efficiency',
      value: '94%',
      trend: '+2.1%',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      title: 'Average Shift Duration',
      value: '8.2h',
      trend: '-0.3h',
      icon: Clock,
      color: 'text-blue-600'
    },
    {
      title: 'Pattern Utilization',
      value: '87%',
      trend: '+5.2%',
      icon: BarChart3,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back{user?.email ? `, ${user.email}` : ''}! Here's your roster management overview.
              </p>
            </div>
            <Badge variant="outline" className="px-3 py-1">
              <Zap className="h-3 w-3 mr-1" />
              Pro Features Available
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <DashboardStats />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Quick Actions - Takes up 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickActions.map((action, index) => (
                    <Card 
                      key={index}
                      className="relative overflow-hidden hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary/20"
                      onClick={action.action}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`${action.color} p-2 rounded-lg`}>
                            <action.icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-sm">{action.title}</h3>
                              {action.badge && (
                                <Badge variant="secondary" className="text-xs px-2 py-0">
                                  {action.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {action.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Pattern Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Quick Pattern Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-auto py-3 flex flex-col gap-2"
                    onClick={() => navigate('/patterns')}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-xs">Create Pattern</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-3 flex flex-col gap-2"
                    onClick={() => navigate('/patterns')}
                  >
                    <Star className="h-4 w-4" />
                    <span className="text-xs">Browse Library</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-3 flex flex-col gap-2"
                    onClick={() => navigate('/patterns')}
                  >
                    <Settings className="h-4 w-4" />
                    <span className="text-xs">Manage</span>
                  </Button>
                </div>
                <Separator />
                <div className="text-center">
                  <Button onClick={() => navigate('/patterns')} className="w-full">
                    <Star className="h-4 w-4 mr-2" />
                    Open Pattern Manager
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Performance Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {insights.map((insight, index) => (
                    <div key={index} className="text-center p-3 rounded-lg bg-muted/50">
                      <insight.icon className={`h-6 w-6 mx-auto mb-2 ${insight.color}`} />
                      <div className="text-2xl font-bold">{insight.value}</div>
                      <div className="text-xs text-muted-foreground">{insight.title}</div>
                      <div className={`text-xs mt-1 ${insight.color}`}>{insight.trend}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity - Takes up 1 column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 py-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <activity.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/my-rosters')}>
                  <FileText className="h-4 w-4 mr-2" />
                  My Rosters
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/my-configurations')}>
                  <Settings className="h-4 w-4 mr-2" />
                  My Configurations
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/reports')}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Reports
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/staffing-analysis')}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* FAB and Modals */}
      <ActionsFAB 
        onNewRoster={() => navigate('/generate-roster')}
        onOpenPatterns={() => navigate('/patterns')}
        onOpenCompliance={() => setShowComplianceDrawer(true)}
      />
      
      <NewRosterWizard 
        isOpen={showNewRosterWizard}
        onClose={() => setShowNewRosterWizard(false)}
        onRosterGenerated={handleRosterGenerated}
        staffList={staffMembers}
      />
      
      <ComplianceDrawer 
        isOpen={showComplianceDrawer}
        onClose={() => setShowComplianceDrawer(false)}
      />
    </div>
  );
}
