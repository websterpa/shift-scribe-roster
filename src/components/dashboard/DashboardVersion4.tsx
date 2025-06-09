
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, FileText, Settings, Star, Trophy, Target, Zap, Award, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const DashboardVersion4 = () => {
  const quickActions = [
    {
      title: 'Manage Staff',
      description: 'Level up your team management',
      icon: Users,
      link: '/staff',
      color: 'from-pink-500 to-rose-500',
      points: '+50 XP'
    },
    {
      title: 'Generate Roster',
      description: 'Master the perfect schedule',
      icon: Calendar,
      link: '/generate-roster',
      color: 'from-green-500 to-emerald-500',
      points: '+100 XP'
    },
    {
      title: 'Leave Requests',
      description: 'Boost team satisfaction',
      icon: FileText,
      link: '/leave-requests',
      color: 'from-blue-500 to-cyan-500',
      points: '+25 XP'
    },
    {
      title: 'Configuration',
      description: 'Optimize your workflow',
      icon: Settings,
      link: '/roster-config',
      color: 'from-purple-500 to-violet-500',
      points: '+75 XP'
    }
  ];

  const achievements = [
    { title: 'Perfect Week', description: 'No scheduling conflicts', icon: Trophy, color: 'text-yellow-500' },
    { title: 'Team Player', description: '100% staff coverage', icon: Users, color: 'text-blue-500' },
    { title: 'Efficiency Master', description: 'Optimized 10 rosters', icon: Zap, color: 'text-purple-500' }
  ];

  const progressRings = [
    { title: 'Weekly Goals', progress: 87, color: 'stroke-green-500', target: 'Complete 5 rosters' },
    { title: 'Team Satisfaction', progress: 94, color: 'stroke-blue-500', target: 'Maintain 90% rating' },
    { title: 'Efficiency Score', progress: 76, color: 'stroke-purple-500', target: 'Reach 80% efficiency' }
  ];

  const ActivityFeedItem = ({ action, time, points, icon: Icon, color }: any) => (
    <div className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-white to-gray-50 border border-gray-100 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{action}</p>
        <p className="text-xs text-gray-500">{time}</p>
      </div>
      <div className="text-right">
        <span className="text-sm font-bold text-green-600">+{points}</span>
        <p className="text-xs text-gray-500">XP</p>
      </div>
    </div>
  );

  const ProgressRing = ({ progress, color, size = 120 }: any) => {
    const radius = (size - 20) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${(progress / 100) * circumference} ${circumference}`;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            className={color}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{progress}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 bg-gradient-to-br from-indigo-50 via-white to-purple-50 min-h-screen p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Welcome Back! 🚀
          </h1>
          <p className="text-lg text-gray-600 mt-2">Ready to achieve your roster management goals?</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">1,247</div>
            <div className="text-sm text-gray-500">Total XP</div>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
            <Award className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Progress Rings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {progressRings.map((ring, index) => (
          <Card key={index} className="bg-white/70 backdrop-blur border-0 shadow-xl hover:shadow-2xl transition-shadow">
            <CardContent className="p-6 text-center">
              <ProgressRing progress={ring.progress} color={ring.color} />
              <h3 className="font-semibold text-gray-900 mt-4">{ring.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{ring.target}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions with Gamification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quickActions.map((action, index) => (
          <Link key={index} to={action.link} className="block group">
            <Card className="bg-white/70 backdrop-blur border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-105 overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`w-16 h-16 bg-gradient-to-br ${action.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <action.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-green-600">{action.points}</span>
                    <p className="text-xs text-gray-500">per action</p>
                  </div>
                </div>
                <CardTitle className="text-xl group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent transition-all">
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

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Achievements */}
        <Card className="bg-white/70 backdrop-blur border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
              Recent Achievements
            </CardTitle>
            <CardDescription>Your latest accomplishments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {achievements.map((achievement, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200">
                <achievement.icon className={`w-6 h-6 ${achievement.color}`} />
                <div>
                  <p className="font-medium text-gray-900">{achievement.title}</p>
                  <p className="text-sm text-gray-600">{achievement.description}</p>
                </div>
                <Star className="w-5 h-5 text-yellow-500 ml-auto" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="bg-white/70 backdrop-blur border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
              Activity Feed
            </CardTitle>
            <CardDescription>Your recent actions and rewards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ActivityFeedItem
              action="Roster generated successfully"
              time="2 hours ago"
              points="100"
              icon={Calendar}
              color="from-green-500 to-emerald-600"
            />
            <ActivityFeedItem
              action="Staff member added"
              time="5 hours ago"
              points="50"
              icon={Users}
              color="from-blue-500 to-cyan-600"
            />
            <ActivityFeedItem
              action="Leave request approved"
              time="1 day ago"
              points="25"
              icon={FileText}
              color="from-purple-500 to-violet-600"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardVersion4;
