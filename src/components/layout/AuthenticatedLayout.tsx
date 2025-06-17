
import React, { useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import Navigation from './Navigation';
import TopBar from './TopBar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { initializeSampleData } from '@/utils/sampleDataHelpers';
import { createLogger } from '@/utils/errorLogger';

const logger = createLogger('AuthenticatedLayout');

export const AuthenticatedLayout: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // Initialize sample data when the authenticated app loads
    const initData = async () => {
      try {
        logger.info('Initializing sample data on app load');
        await initializeSampleData();
      } catch (error) {
        logger.error(new Error('Failed to initialize sample data'), { originalError: error });
        // Don't block the app if sample data fails
      }
    };
    
    initData();
  }, []);

  // Pages that need back navigation
  const needsBackNavigation = [
    '/roster-config',
    '/generate-roster',
    '/roster-viewer',
    '/my-configurations',
    '/my-rosters',
    '/manage-leave',
    '/staffing-analysis',
    '/roster-testing',
    '/test-pro',
    '/patterns',
    '/support'
  ];

  const showBackButton = needsBackNavigation.includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      <Navigation />
      
      {showBackButton && (
        <div className="border-b bg-white">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <span className="text-gray-300">|</span>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <Home className="h-4 w-4 mr-1" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
      
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};
