
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Simple components to get the app working
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

const Dashboard = () => (
  <div className="min-h-screen bg-gray-50 p-8">
    <h1 className="text-3xl font-bold text-gray-900">CCTV Roster Dashboard</h1>
    <p className="mt-4 text-gray-600">Welcome to the CCTV roster management system.</p>
  </div>
);

const LandingPage = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900">CCTV Roster System</h1>
      <p className="mt-4 text-lg text-gray-600">Manage your CCTV operator shifts efficiently</p>
      <button className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        Get Started
      </button>
    </div>
  </div>
);

export const AppRouter: React.FC = () => {
  // Simplified routing without auth for now
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </Router>
  );
};
