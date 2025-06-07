
import React from "react";
import { useSubscription } from "@/hooks/useSubscription";

export default function TestPro() {
  const { hasPro } = useSubscription();
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Pro Access Test</h1>
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-lg mb-4">
            🔍 hasPro = {hasPro ? "✅ Pro (all features unlocked)" : "❌ Free"}
          </div>
          <div className="text-sm text-gray-600">
            This page verifies that all users have Pro access by default.
          </div>
        </div>
      </div>
    </div>
  );
}
