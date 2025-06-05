
import React from 'react';
import StaffList from '@/components/staff/StaffList';

const Staff = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
      </div>
      <StaffList />
    </div>
  );
};

export default Staff;
