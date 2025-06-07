
import React from 'react';
import { SubscriptionGate } from '@/components/subscription/SubscriptionGate';
import { RosterGenerationSettings } from '@/components/roster/RosterGenerationSettings';

const GenerateRoster = () => {
  return (
    <SubscriptionGate 
      feature="Roster Generation" 
      description="Generate optimized shift rosters with our advanced scheduling algorithms"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Generate Roster</h1>
          <p className="text-gray-600">
            Create optimized shift schedules based on your configuration and staff availability.
          </p>
        </div>
        <RosterGenerationSettings />
      </div>
    </SubscriptionGate>
  );
};

export default GenerateRoster;
