
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SimpleAuth } from '@/components/auth/SimpleAuth';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { createLogger } from '@/utils/errorLogger';

// Import pages
import Dashboard from '@/pages/Dashboard';
import GenerateRoster from '@/pages/GenerateRoster';
import MyConfigurations from '@/pages/MyConfigurations';
import MyRosters from '@/pages/MyRosters';
import RosterConfig from '@/pages/RosterConfig';
import Staff from '@/pages/Staff';
import LeaveRequests from '@/pages/LeaveRequests';
import ManageLeave from '@/pages/ManageLeave';
import NotFound from '@/pages/NotFound';

const logger = createLogger('AppRouter');

export const AppRouter: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = () => {
      try {
        const authStatus = localStorage.getItem('demo_authenticated');
        setIsAuthenticated(authStatus === 'true');
        logger.info('Authentication status checked', { isAuthenticated: authStatus === 'true' });
      } catch (error) {
        logger.error(new Error('Error checking authentication'), { originalError: error });
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (authenticated: boolean) => {
    setIsAuthenticated(authenticated);
    logger.info('Authentication state updated', { authenticated });
  };

  const handleLogout = () => {
    localStorage.removeItem('demo_authenticated');
    setIsAuthenticated(false);
    logger.info('User logged out');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SimpleAuth onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthenticatedLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="generate-roster" element={<GenerateRoster />} />
          <Route path="my-configurations" element={<MyConfigurations />} />
          <Route path="my-rosters" element={<MyRosters />} />
          <Route path="roster-config" element={<RosterConfig />} />
          <Route path="staff" element={<Staff />} />
          <Route path="leave-requests" element={<LeaveRequests />} />
          <Route path="manage-leave" element={<ManageLeave />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
};
