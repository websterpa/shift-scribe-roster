
import React from 'react';
import { SubscriptionGate } from '@/components/subscription/SubscriptionGate';
import { RosterDisplayContainer } from '@/components/roster/RosterDisplayContainer';

const MyRosters = () => {
  return (
    <SubscriptionGate 
      feature="Roster Viewing" 
      description="Access and manage your generated rosters with export capabilities"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Rosters</h1>
          <p className="text-gray-600">
            View, manage, and export your generated shift rosters.
          </p>
        </div>
        <RosterDisplayContainer />
      </div>
    </SubscriptionGate>
  );
};

export default MyRosters;
