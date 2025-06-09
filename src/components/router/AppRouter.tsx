
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from '@/pages/LandingPage';
import AuthPage from '@/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import Staff from '@/pages/Staff';
import LeaveRequests from '@/pages/LeaveRequests';
import GenerateRoster from '@/pages/GenerateRoster';
import RosterConfig from '@/pages/RosterConfig';
import MyConfigurations from '@/pages/MyConfigurations';
import MyRosters from '@/pages/MyRosters';
import TestPro from '@/pages/TestPro';
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
          <Route path="/auth" element={<AuthPage />} />
          
          {/* Protected routes wrapped in AuthenticatedLayout */}
          <Route path="/dashboard" element={
            <AuthenticatedLayout>
              <Dashboard />
            </AuthenticatedLayout>
          } />
          <Route path="/staff" element={
            <AuthenticatedLayout>
              <Staff />
            </AuthenticatedLayout>
          } />
          <Route path="/generate-roster" element={
            <AuthenticatedLayout>
              <GenerateRoster />
            </AuthenticatedLayout>
          } />
          <Route path="/leave-requests" element={
            <AuthenticatedLayout>
              <LeaveRequests />
            </AuthenticatedLayout>
          } />
          <Route path="/roster-config" element={
            <AuthenticatedLayout>
              <RosterConfig />
            </AuthenticatedLayout>
          } />
          <Route path="/my-configurations" element={
            <AuthenticatedLayout>
              <MyConfigurations />
            </AuthenticatedLayout>
          } />
          <Route path="/my-rosters" element={
            <AuthenticatedLayout>
              <MyRosters />
            </AuthenticatedLayout>
          } />
          <Route path="/test-pro" element={
            <AuthenticatedLayout>
              <TestPro />
            </AuthenticatedLayout>
          } />
          
          {/* Fallback route */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};
