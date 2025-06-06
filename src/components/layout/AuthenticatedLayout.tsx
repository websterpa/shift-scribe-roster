
import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import { initializeSampleData } from '@/utils/sampleDataHelpers';
import { createLogger } from '@/utils/errorLogger';

const logger = createLogger('AuthenticatedLayout');

export const AuthenticatedLayout: React.FC = () => {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};
