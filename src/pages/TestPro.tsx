
import React from "react";

export default function TestPro() {
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Pro Access Test</h1>
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-lg mb-4">
            ✅ Pro Features: All users have full Pro access enabled
          </div>
          <div className="text-sm text-gray-600">
            Demo/free mode restrictions have been removed. All logged-in users immediately have Pro features.
          </div>
        </div>
      </div>
    </div>
  );
}
