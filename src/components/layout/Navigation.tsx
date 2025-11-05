
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Users, FileText, BarChart3, HelpCircle, Wand2, Shield, ListTree, Calculator } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const Navigation = () => {
  const location = useLocation();
  const { isAdmin } = useAdminAuth();

  const isActive = (path: string) => location.pathname === path;

  const navigationItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Calendar, gradient: 'from-blue-500 to-purple-600' },
    { path: '/staff', label: 'Staff', icon: Users, gradient: 'from-yellow-500 to-orange-600' },
    { path: '/feasibility', label: 'Feasibility', icon: Calculator, gradient: 'from-cyan-500 to-blue-600' },
    { path: '/roster/builder', label: 'Roster Builder', icon: Wand2, gradient: 'from-indigo-500 to-blue-600' },
    { path: '/my-rosters', label: 'My Rosters', icon: FileText, gradient: 'from-purple-500 to-pink-600' },
    { path: '/reports/archived-rosters', label: 'Version History', icon: BarChart3, gradient: 'from-emerald-500 to-green-600' },
    { path: '/leave-requests', label: 'Leave Requests', icon: FileText, gradient: 'from-purple-500 to-pink-600' },
    { path: '/reports', label: 'Reports', icon: BarChart3, gradient: 'from-emerald-500 to-green-600' },
    { path: '/help', label: 'Help & Support', icon: HelpCircle, gradient: 'from-teal-500 to-cyan-600' },
    { path: '/admin/pattern-library', label: 'Shift Patterns', icon: ListTree, gradient: 'from-violet-500 to-purple-600', adminOnly: true },
    { path: '/admin/rls-setup', label: 'Admin: RLS Setup', icon: Shield, gradient: 'from-red-500 to-rose-600', adminOnly: true }
  ];

  // Filter navigation items based on admin status
  const visibleItems = navigationItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <nav className="bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 shadow-lg border-b border-blue-100/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4">
          {/* Desktop Navigation - Horizontal scroll on small screens */}
          <div className="hidden sm:block overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {visibleItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap shrink-0 ${
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

          {/* Mobile Navigation Menu - Horizontal scroll */}
          <div className="sm:hidden overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max pb-1">
              {visibleItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-300 ${
                    isActive(item.path)
                      ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg`
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-2" />
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
