
import React from 'react';
import { StaffMember } from '@/types/roster';
import { StaffRow } from './StaffRow';

interface StaffTableProps {
  staffMembers: StaffMember[];
  onEdit: (staff: StaffMember) => void;
  onDelete: (staffId: string) => void;
}

export const StaffTable = ({ staffMembers, onEdit, onDelete }: StaffTableProps) => {
  console.log('🔄 StaffTable component rendered with', staffMembers.length, 'members');

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4 font-medium">Name</th>
            <th className="text-left py-3 px-4 font-medium">Employee ID</th>
            <th className="text-left py-3 px-4 font-medium">Role</th>
            <th className="text-left py-3 px-4 font-medium">Rate</th>
            <th className="text-left py-3 px-4 font-medium">Hours/Week</th>
            <th className="text-left py-3 px-4 font-medium">Eligible Shifts</th>
            <th className="text-left py-3 px-4 font-medium">Status</th>
            <th className="text-right py-3 px-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {staffMembers.map((staff) => (
            <StaffRow 
              key={staff.id} 
              staff={staff} 
              onEdit={onEdit} 
              onDelete={onDelete} 
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
