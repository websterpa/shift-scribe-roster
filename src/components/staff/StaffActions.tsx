
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, User } from 'lucide-react';

interface StaffActionsProps {
  onAddStaff: () => void;
  staffCount: number;
}

export const StaffActions = ({ onAddStaff, staffCount }: StaffActionsProps) => {
  console.log('🔄 StaffActions component rendered');

  if (staffCount === 0) {
    return (
      <div className="text-center py-8">
        <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members yet</h3>
        <p className="text-gray-500 mb-4">
          Add your first staff member to get started with roster generation.
        </p>
        <Button onClick={() => {
          console.log('➕ StaffActions: Add first staff member clicked');
          onAddStaff();
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add First Staff Member
        </Button>
      </div>
    );
  }

  return null;
};
