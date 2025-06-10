import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Users, FileText, Settings, FolderOpen, Archive, Zap, TestTube, FlaskConical, BarChart3 } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navigationItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Calendar, gradient: 'from-blue-500 to-purple-600' },
    { path: '/staff', label: 'Staff', icon: Users, gradient: 'from-yellow-500 to-orange-600' },
    { path: '/leave-requests', label: 'Leave Requests', icon: FileText, gradient: 'from-purple-500 to-pink-600' },
    { path: '/staffing-analysis', label: 'Staffing Analysis', icon: BarChart3, gradient: 'from-cyan-500 to-blue-600' },
    { path: '/my-configurations', label: 'My Configs', icon: FolderOpen, gradient: 'from-teal-500 to-cyan-600' },
    { path: '/roster-config', label: 'Configuration', icon: Settings, gradient: 'from-indigo-500 to-purple-600' },
    { path: '/generate-roster', label: 'Generate Roster', icon: Zap, gradient: 'from-green-500 to-teal-600' },
    { path: '/my-rosters', label: 'My Rosters', icon: Archive, gradient: 'from-rose-500 to-pink-600' },
    { path: '/roster-testing', label: 'Roster Testing', icon: FlaskConical, gradient: 'from-emerald-500 to-teal-600' },
    { path: '/test-pro', label: 'Test Pro', icon: TestTube, gradient: 'from-violet-500 to-purple-600' }
  ];

  return (
    <nav className="bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 shadow-lg border-b border-blue-100/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4">
          {/* Desktop Navigation - Word wrapping */}
          <div className="hidden sm:block">
            <div className="flex flex-wrap gap-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                    isActive(item.path)
                      ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg transform scale-105`
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-md hover:scale-105'
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          <div className="sm:hidden">
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive(item.path)
                      ? `bg-gradient-to-r ${item.gradient} text-white`
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-2 inline" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
