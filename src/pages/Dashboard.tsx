
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, FileText, Settings, Crown, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';

const Dashboard = () => {
  const { subscription, hasProAccess } = useSubscription();

  const quickActions = [
    {
      title: 'Manage Staff',
      description: 'Add, edit, and manage your staff members',
      icon: Users,
      link: '/staff',
      color: 'bg-blue-500'
    },
    {
      title: 'Generate Roster',
      description: 'Create optimized shift schedules',
      icon: Calendar,
      link: '/generate-roster',
      color: 'bg-green-500',
      proOnly: true
    },
    {
      title: 'Leave Requests',
      description: 'Review and manage leave requests',
      icon: FileText,
      link: '/leave-requests',
      color: 'bg-yellow-500'
    },
    {
      title: 'Configuration',
      description: 'Set up roster parameters',
      icon: Settings,
      link: '/roster-config',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome to your CCTV Roster management system</p>
        </div>
        <div className="flex items-center space-x-2">
          {hasProAccess ? (
            <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600">
              <Crown className="w-4 h-4 mr-1" />
              Pro Plan
            </Badge>
          ) : (
            <Badge variant="outline">Free Plan</Badge>
          )}
        </div>
      </div>

      {!hasProAccess && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Crown className="w-5 h-5 mr-2 text-yellow-500" />
              Upgrade to Pro
            </CardTitle>
            <CardDescription>
              Unlock roster generation and advanced features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Get access to full roster generation, unlimited staff, and export capabilities
                </p>
                <p className="text-2xl font-bold text-gray-900">£49/month</p>
              </div>
              <Link to="/pricing">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Upgrade Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, index) => (
          <Link key={index} to={action.link} className="block">
            <Card className={`hover:shadow-lg transition-shadow ${action.proOnly && !hasProAccess ? 'opacity-75' : ''}`}>
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg flex items-center">
                  {action.title}
                  {action.proOnly && !hasProAccess && (
                    <Badge variant="outline" className="ml-2 text-xs">Pro</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{action.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates to your rosters and staff</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                No recent activity to display
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Overview of your current setup</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Plan:</span>
                <span className="text-sm font-medium">
                  {subscription?.subscription_tier === 'pro' ? 'Pro' : 'Free'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <span className="text-sm font-medium">
                  {subscription?.subscription_status || 'Active'}
                </span>
              </div>
              {subscription?.subscription_end_date && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Expires:</span>
                  <span className="text-sm font-medium">
                    {new Date(subscription.subscription_end_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
