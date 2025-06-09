
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, FileText, Settings, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

const DashboardVersion2 = () => {
  const quickActions = [
    {
      title: 'Staff Management',
      description: 'Manage your team efficiently',
      icon: Users,
      link: '/staff'
    },
    {
      title: 'Roster Generation',
      description: 'Create optimal schedules',
      icon: Calendar,
      link: '/generate-roster'
    },
    {
      title: 'Leave Management',
      description: 'Handle leave requests',
      icon: FileText,
      link: '/leave-requests'
    },
    {
      title: 'System Configuration',
      description: 'Adjust system settings',
      icon: Settings,
      link: '/roster-config'
    }
  ];

  const metrics = [
    { label: 'Total Staff', value: '24' },
    { label: 'Active Shifts', value: '168' },
    { label: 'Pending Reviews', value: '3' },
    { label: 'System Efficiency', value: '98%' }
  ];

  return (
    <div className="space-y-12">
      <div className="text-center">
        <h1 className="text-5xl font-light text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground text-lg">Streamlined roster management</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {metrics.map((metric, index) => (
          <div key={index} className="text-center space-y-2">
            <div className="text-4xl font-light text-foreground">{metric.value}</div>
            <div className="text-sm text-muted-foreground uppercase tracking-wide">{metric.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {quickActions.map((action, index) => (
          <Link key={index} to={action.link} className="block group">
            <Card className="border-border/50 hover:border-border transition-colors duration-200 h-full">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 flex items-center justify-center mb-6">
                  <action.icon className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <CardTitle className="text-xl font-medium text-foreground group-hover:text-primary transition-colors">
                  {action.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {action.description}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center">
              <BarChart3 className="w-5 h-5 mr-3 text-muted-foreground" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Operational</span>
              <span className="text-foreground font-medium">Active</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="text-foreground font-medium">2 min ago</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center">
              <Calendar className="w-5 h-5 mr-3 text-muted-foreground" />
              Schedule Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">This Week</span>
              <span className="text-foreground font-medium">Complete</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Next Week</span>
              <span className="text-foreground font-medium">In Progress</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center">
              <Users className="w-5 h-5 mr-3 text-muted-foreground" />
              Team Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Available</span>
              <span className="text-foreground font-medium">21</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">On Leave</span>
              <span className="text-foreground font-medium">3</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardVersion2;
