
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from '@/pages/LandingPage';
import PricingPage from '@/pages/PricingPage';
import AuthPage from '@/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import Staff from '@/pages/Staff';
import LeaveRequests from '@/pages/LeaveRequests';
import ReportsPage from '@/pages/ReportsPage';
import SupportPage from '@/pages/SupportPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { AuthProvider } from '@/components/auth/AuthProvider';

// Simple loading component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

export const AppRouter: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/auth" element={<AuthPage />} />
          
          {/* Protected routes with AuthenticatedLayout as parent */}
          <Route path="/" element={<AuthenticatedLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="staff" element={<Staff />} />
            <Route path="leave-requests" element={<LeaveRequests />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>
          
          {/* Fallback route */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};
