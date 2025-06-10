
import React from "react";
import { TestingDashboard } from "@/components/testing/TestingDashboard";
import { TestTube } from "lucide-react";

export default function RosterTesting() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <TestTube className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Roster Testing Suite</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Comprehensive testing tools for validating roster generation algorithms, 
          detecting overstaffing issues, and monitoring performance metrics.
        </p>
      </div>
      
      <TestingDashboard />
    </div>
  );
}
