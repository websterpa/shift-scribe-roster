
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from '@/components/auth/AuthProvider';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import Index from '@/pages/Index';
import LandingPage from '@/pages/LandingPage';
import PricingPage from '@/pages/PricingPage';
import AuthPage from '@/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import Staff from '@/pages/Staff';
import { MonthlyPage } from '@/features/roster/monthly/MonthlyPage';
import RosterConfig from '@/pages/RosterConfig';
import GenerateRoster from '@/pages/GenerateRoster';
import GenerateRosterPanel from '@/components/GenerateRosterPanel';
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
import HelpSupport from '@/pages/HelpSupport';
import Wizard from '@/pages/Wizard';
import RosterSummary from '@/pages/RosterSummary';
import GuidedRosterBuilderV2 from '@/pages/roster/GuidedRosterBuilderV2';
import RLSHelp from '@/pages/Admin/RLSHelp';
import NotFound from '@/pages/NotFound';

export function AppRouter() {
  return (
    <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            
            {/* Authenticated routes with layout */}
            <Route path="/" element={<ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="staff" element={<Staff />} />
              <Route path="roster-config" element={<RosterConfig />} />
              <Route path="generate-roster" element={<GenerateRoster />} />
              <Route path="manager/generate" element={<GenerateRosterPanel />} />
              <Route path="roster-viewer" element={<RosterViewer />} />
              <Route path="my-rosters" element={<MyRosters />} />
              <Route path="my-configurations" element={<MyConfigurations />} />
              <Route path="manage-leave" element={<ManageLeave />} />
              <Route path="leave-requests" element={<LeaveRequests />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="staffing-analysis" element={<StaffingAnalysis />} />
              <Route path="roster-testing" element={<RosterTesting />} />
              <Route path="test-pro" element={<TestPro />} />
              <Route path="support" element={<SupportPage />} />
              <Route path="help" element={<HelpSupport />} />
              <Route path="patterns" element={<PatternManagement />} />
              <Route path="roster/builder" element={<GuidedRosterBuilderV2 />} />
              <Route path="roster/summary" element={<RosterSummary />} />
              <Route path="roster/monthly" element={<MonthlyPage />} />
              <Route path="wizard" element={<Wizard />} />
              <Route path="admin/rls-setup" element={<RLSHelp />} />
            </Route>
            
            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
  );
}
