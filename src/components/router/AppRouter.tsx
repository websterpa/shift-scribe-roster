
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SupabaseAuth } from '@/components/auth/SupabaseAuth';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
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
  const { isAuthenticated, loading } = useSupabaseAuth();

  const handleAuthSuccess = () => {
    logger.info('Authentication successful, reloading to sync state');
    window.location.reload(); // Simple way to ensure auth state is synced
  };

  if (loading) {
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
    return <SupabaseAuth onAuthSuccess={handleAuthSuccess} />;
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
