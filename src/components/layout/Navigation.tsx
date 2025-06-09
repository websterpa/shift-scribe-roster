import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Users, FileText, Settings, FolderOpen, Archive, Zap, LogOut, TestTube } from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

const Navigation = () => {
  const location = useLocation();
  const { user, signOut } = useSupabaseAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <nav className="bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 shadow-lg border-b border-blue-100/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <div className="flex items-center">
                <img 
                  src="/lovable-uploads/4baad420-9f35-41c0-b679-bf3fb947409c.png" 
                  alt="ShiftCraft Logo" 
                  className="h-40 w-auto"
                />
              </div>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-2">
              <Link
                to="/dashboard"
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive('/dashboard')
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-md hover:scale-105'
                }`}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
              <Link
                to="/generate-roster"
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive('/generate-roster')
                    ? 'bg-gradient-to-r from-green-500 to-teal-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-md hover:scale-105'
                }`}
              >
                <Zap className="w-4 h-4 mr-2" />
                Generate Roster
              </Link>
              <Link
                to="/staff"
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive('/staff')
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-md hover:scale-105'
                }`}
              >
                <Users className="w-4 h-4 mr-2" />
                Staff
              </Link>
              <Link
                to="/leave-requests"
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive('/leave-requests')
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-md hover:scale-105'
                }`}
              >
                <FileText className="w-4 h-4 mr-2" />
                Leave Requests
              </Link>
              <Link
                to="/roster-config"
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive('/roster-config')
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-md hover:scale-105'
                }`}
              >
                <Settings className="w-4 h-4 mr-2" />
                Configuration
              </Link>
              <Link
                to="/my-configurations"
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive('/my-configurations')
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-md hover:scale-105'
                }`}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                My Configs
              </Link>
              <Link
                to="/my-rosters"
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive('/my-rosters')
                    ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-md hover:scale-105'
                }`}
              >
                <Archive className="w-4 h-4 mr-2" />
                My Rosters
              </Link>
              <Link
                to="/test-pro"
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive('/test-pro')
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-md hover:scale-105'
                }`}
              >
                <TestTube className="w-4 h-4 mr-2" />
                Test Pro
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full shadow-md">
              <span className="text-sm font-medium text-gray-700">{user?.email}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="bg-white/80 hover:bg-white border-gray-200 hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
