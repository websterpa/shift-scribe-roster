
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, FileText, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
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
      color: 'bg-green-500'
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, index) => (
          <Link key={index} to={action.link} className="block">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg">
                  {action.title}
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
                <span className="text-sm font-medium">Pro</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <span className="text-sm font-medium">Active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
