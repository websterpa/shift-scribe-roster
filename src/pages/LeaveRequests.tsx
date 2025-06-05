
import React from 'react';
import LeaveRequestsList from '@/components/leave/LeaveRequestsList';

const LeaveRequests = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Leave Requests</h1>
      </div>
      <LeaveRequestsList />
    </div>
  );
};

export default LeaveRequests;
