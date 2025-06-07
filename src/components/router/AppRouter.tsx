
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SupabaseAuth } from '@/components/auth/SupabaseAuth';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { createLogger } from '@/utils/errorLogger';

// Import pages
import LandingPage from '@/pages/LandingPage';
import AuthPage from '@/pages/AuthPage';
import PricingPage from '@/pages/PricingPage';
import SupportPage from '@/pages/SupportPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
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

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        
        {/* Protected routes */}
        {isAuthenticated ? (
          <Route path="/*" element={<AuthenticatedLayout />}>
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
        ) : (
          <Route path="/*" element={<AuthPage />} />
        )}
      </Routes>
    </Router>
  );
};
