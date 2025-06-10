
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Users, FileText, Settings, FolderOpen, Archive, Zap, TestTube, FlaskConical } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 shadow-lg border-b border-blue-100/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4">
          {/* Desktop Navigation - Two rows */}
          <div className="hidden sm:block">
            {/* First row */}
            <div className="flex flex-wrap gap-2 mb-2">
              <Link
                to="/dashboard"
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
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
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
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
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
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
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
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
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  isActive('/roster-config')
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-md hover:scale-105'
                }`}
              >
                <Settings className="w-4 h-4 mr-2" />
                Configuration
              </Link>
            </div>
            
            {/* Second row */}
            <div className="flex flex-wrap gap-2">
              <Link
                to="/generate-roster"
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
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
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
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
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
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
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
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

          {/* Mobile Navigation Menu */}
          <div className="sm:hidden">
            <div className="space-y-1 max-h-96 overflow-y-auto">
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
      </div>
    </nav>
  );
};

export default Navigation;
