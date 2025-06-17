
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import StaffList from '@/components/staff/StaffList';

const Staff = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <Home className="h-4 w-4 mr-1" />
                Dashboard
              </Button>
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">Staff Management</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
        </div>
      </div>
      <StaffList />
    </div>
  );
};

export default Staff;
