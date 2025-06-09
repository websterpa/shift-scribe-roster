
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, FileText, Settings, Activity, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const DashboardVersion3 = () => {
  const quickActions = [
    { title: 'Staff', icon: Users, link: '/staff', color: 'bg-blue-600' },
    { title: 'Roster', icon: Calendar, link: '/generate-roster', color: 'bg-green-600' },
    { title: 'Requests', icon: FileText, link: '/leave-requests', color: 'bg-yellow-600' },
    { title: 'Config', icon: Settings, link: '/roster-config', color: 'bg-purple-600' }
  ];

  const weeklyData = [
    { day: 'Mon', shifts: 24, hours: 192 },
    { day: 'Tue', shifts: 22, hours: 176 },
    { day: 'Wed', shifts: 26, hours: 208 },
    { day: 'Thu', shifts: 24, hours: 192 },
    { day: 'Fri', shifts: 25, hours: 200 },
    { day: 'Sat', shifts: 20, hours: 160 },
    { day: 'Sun', shifts: 18, hours: 144 }
  ];

  const utilizationData = [
    { name: 'Day Shift', value: 45, color: '#3b82f6' },
    { name: 'Night Shift', value: 30, color: '#1d4ed8' },
    { name: 'Weekend', value: 25, color: '#60a5fa' }
  ];

  const kpiData = [
    { title: 'Staff Utilization', value: '87.5%', change: '+2.3%', trend: 'up', icon: Users },
    { title: 'Schedule Efficiency', value: '94.2%', change: '+1.8%', trend: 'up', icon: Activity },
    { title: 'Average Hours/Week', value: '168.5', change: '-0.5', trend: 'down', icon: Clock },
    { title: 'Compliance Rate', value: '98.1%', change: '+0.9%', trend: 'up', icon: TrendingUp }
  ];

  return (
    <div className="space-y-6 bg-gray-50 min-h-screen p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Real-time insights into your roster performance</p>
        </div>
        <div className="flex space-x-2">
          {quickActions.map((action, index) => (
            <Link key={index} to={action.link}>
              <div className={`${action.color} text-white p-3 rounded-lg hover:opacity-90 transition-opacity`}>
                <action.icon className="w-5 h-5" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => (
          <Card key={index} className="bg-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className={`w-4 h-4 mr-1 ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
                    <span className={`text-sm ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {kpi.change}
                    </span>
                  </div>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <kpi.icon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Weekly Shift Distribution</CardTitle>
            <CardDescription>Number of shifts scheduled per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Bar dataKey="shifts" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Staff Utilization</CardTitle>
            <CardDescription>Distribution across shift types</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={utilizationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {utilizationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center space-x-4 mt-4">
              {utilizationData.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: item.color}}></div>
                  <span className="text-sm text-gray-600">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-amber-600" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center p-3 bg-red-50 rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
              <div>
                <p className="text-sm font-medium">Understaffed: Night Shift</p>
                <p className="text-xs text-gray-500">Tuesday 23:00 - 07:00</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
              <div>
                <p className="text-sm font-medium">3 Leave Requests Pending</p>
                <p className="text-xs text-gray-500">Requires approval</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Roster generated successfully</p>
                  <p className="text-xs text-gray-500">Week 47 schedule completed - 2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Staff member added</p>
                  <p className="text-xs text-gray-500">John Smith added to Security team - 5 hours ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Configuration updated</p>
                  <p className="text-xs text-gray-500">Minimum staff requirements modified - 1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardVersion3;
