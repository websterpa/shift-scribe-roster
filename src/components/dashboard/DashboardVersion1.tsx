
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, FileText, Settings, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const DashboardVersion1 = () => {
  const quickActions = [
    {
      title: 'Manage Staff',
      description: 'Add, edit, and manage your staff members',
      icon: Users,
      link: '/staff',
      gradient: 'from-blue-500 to-purple-600'
    },
    {
      title: 'Generate Roster',
      description: 'Create optimized shift schedules',
      icon: Calendar,
      link: '/generate-roster',
      gradient: 'from-green-500 to-teal-600'
    },
    {
      title: 'Leave Requests',
      description: 'Review and manage leave requests',
      icon: FileText,
      link: '/leave-requests',
      gradient: 'from-yellow-500 to-orange-600'
    },
    {
      title: 'Configuration',
      description: 'Set up roster parameters',
      icon: Settings,
      link: '/roster-config',
      gradient: 'from-purple-500 to-pink-600'
    }
  ];

  const stats = [
    { label: 'Active Staff', value: '24', change: '+2', icon: Users },
    { label: 'This Week Shifts', value: '168', change: '+12', icon: Calendar },
    { label: 'Pending Requests', value: '3', change: '-1', icon: FileText },
    { label: 'Completion Rate', value: '98%', change: '+5%', icon: TrendingUp }
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-lg text-muted-foreground mt-2">Welcome to your CCTV Roster management system</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-sm text-green-600 flex items-center mt-1">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {stat.change}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quickActions.map((action, index) => (
          <Link key={index} to={action.link} className="block group">
            <Card className="relative overflow-hidden hover:shadow-2xl transition-all duration-500 group-hover:scale-105">
              <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              <CardHeader className="pb-3">
                <div className={`w-16 h-16 bg-gradient-to-br ${action.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <action.icon className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                  {action.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{action.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest updates to your rosters and staff</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Roster generated successfully</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">New staff member added</p>
                <p className="text-xs text-muted-foreground">5 hours ago</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
              Performance Metrics
            </CardTitle>
            <CardDescription>Overview of your system performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Staff Utilization</span>
                <span className="font-medium">87%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full" style={{width: '87%'}}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Schedule Compliance</span>
                <span className="font-medium">94%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-500 to-teal-600 h-2 rounded-full" style={{width: '94%'}}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardVersion1;
