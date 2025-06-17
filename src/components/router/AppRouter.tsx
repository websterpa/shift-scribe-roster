
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Index from '@/pages/Index';
import LandingPage from '@/pages/LandingPage';
import PricingPage from '@/pages/PricingPage';
import AuthPage from '@/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import Staff from '@/pages/Staff';
import RosterConfig from '@/pages/RosterConfig';
import GenerateRoster from '@/pages/GenerateRoster';
import RosterViewer from '@/pages/RosterViewer';
import MyRosters from '@/pages/MyRosters';
import MyConfigurations from '@/pages/MyConfigurations';
import ManageLeave from '@/pages/ManageLeave';
import LeaveRequests from '@/pages/LeaveRequests';
import ReportsPage from '@/pages/ReportsPage';
import StaffingAnalysis from '@/pages/StaffingAnalysis';
import RosterTesting from '@/pages/RosterTesting';
import TestPro from '@/pages/TestPro';
import SupportPage from '@/pages/SupportPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
import PatternManagement from '@/pages/PatternManagement';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export function AppRouter() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/roster-config" element={<RosterConfig />} />
            <Route path="/generate-roster" element={<GenerateRoster />} />
            <Route path="/roster-viewer" element={<RosterViewer />} />
            <Route path="/my-rosters" element={<MyRosters />} />
            <Route path="/my-configurations" element={<MyConfigurations />} />
            <Route path="/manage-leave" element={<ManageLeave />} />
            <Route path="/leave-requests" element={<LeaveRequests />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/staffing-analysis" element={<StaffingAnalysis />} />
            <Route path="/roster-testing" element={<RosterTesting />} />
            <Route path="/test-pro" element={<TestPro />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/patterns" element={<PatternManagement />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
