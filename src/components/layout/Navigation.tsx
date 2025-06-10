
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Users, FileText, Settings, FolderOpen, Archive, Zap, LogOut, TestTube, ChevronDown, User, FlaskConical } from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    <nav className="bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 shadow-lg border-b border-blue-100/50 backdrop-blur-sm relative z-40">
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
            <div className="hidden sm:ml-8 sm:flex sm:space-x-2 sm:overflow-x-auto">
              <Link
                to="/dashboard"
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  isActive('/dashboard')
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-md hover:scale-105'
                }`}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
              <Link
                to="/staff"
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
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
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  isActive('/leave-requests')
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-md hover:scale-105'
                }`}
              >
                <FileText className="w-4 h-4 mr-2" />
                Leave Requests
              </Link>
              <Link
                to="/my-configurations"
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  isActive('/my-configurations')
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-md hover:scale-105'
                }`}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                My Configs
              </Link>
              <Link
                to="/roster-config"
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  isActive('/roster-config')
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-md hover:scale-105'
                }`}
              >
                <Settings className="w-4 h-4 mr-2" />
                Configuration
              </Link>
              <Link
                to="/generate-roster"
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  isActive('/generate-roster')
                    ? 'bg-gradient-to-r from-green-500 to-teal-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-md hover:scale-105'
                }`}
              >
                <Zap className="w-4 h-4 mr-2" />
                Generate Roster
              </Link>
              <Link
                to="/my-rosters"
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  isActive('/my-rosters')
                    ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-md hover:scale-105'
                }`}
              >
                <Archive className="w-4 h-4 mr-2" />
                My Rosters
              </Link>
              <Link
                to="/roster-testing"
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  isActive('/roster-testing')
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-md hover:scale-105'
                }`}
              >
                <FlaskConical className="w-4 h-4 mr-2" />
                Roster Testing
              </Link>
              <Link
                to="/test-pro"
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
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
          <div className="flex items-center relative z-50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-white/80 hover:bg-white border-gray-200 hover:shadow-lg transition-all duration-300 hover:scale-105 relative z-50"
                >
                  <User className="w-4 h-4 mr-2" />
                  Profile
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white/95 backdrop-blur-sm z-[100] shadow-xl border border-gray-200">
                <div className="px-3 py-2 text-sm">
                  <p className="font-medium text-gray-900">Signed in as</p>
                  <p className="text-gray-600 truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1 max-h-96 overflow-y-auto">
            {/* Mobile navigation links */}
            <Link
              to="/dashboard"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/dashboard')
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <Calendar className="w-4 h-4 mr-2 inline" />
              Dashboard
            </Link>
            <Link
              to="/staff"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/staff')
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <Users className="w-4 h-4 mr-2 inline" />
              Staff
            </Link>
            <Link
              to="/leave-requests"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/leave-requests')
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <FileText className="w-4 h-4 mr-2 inline" />
              Leave Requests
            </Link>
            <Link
              to="/roster-testing"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/roster-testing')
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <FlaskConical className="w-4 h-4 mr-2 inline" />
              Roster Testing
            </Link>
            <Link
              to="/test-pro"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/test-pro')
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <TestTube className="w-4 h-4 mr-2 inline" />
              Test Pro
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
