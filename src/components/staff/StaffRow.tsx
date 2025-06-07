
import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { StaffMember } from '@/types/roster';

interface StaffRowProps {
  staff: StaffMember;
  onEdit: (staff: StaffMember) => void;
  onDelete: (staffId: string) => void;
}

export const StaffRow = ({ staff, onEdit, onDelete }: StaffRowProps) => {
  console.log('🔄 StaffRow rendered for:', staff.first_name, staff.last_name);

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="py-3 px-4">
        <div className="font-medium">{staff.first_name} {staff.last_name}</div>
        <div className="text-sm text-gray-500">{staff.email}</div>
      </td>
      <td className="py-3 px-4">{staff.employee_id}</td>
      <td className="py-3 px-4">{staff.role}</td>
      <td className="py-3 px-4">£{staff.hourly_rate}/hr</td>
      <td className="py-3 px-4">
        <div className="text-sm">
          {staff.min_hours_per_week} - {staff.max_hours_per_week}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-1">
          {staff.eligible_shifts?.map((shift, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {shift}
            </span>
          )) || <span className="text-gray-400">None</span>}
        </div>
      </td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          staff.is_active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {staff.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('✏️ StaffRow: Edit clicked for:', staff.id);
              onEdit(staff);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('🗑️ StaffRow: Delete clicked for:', staff.id);
              onDelete(staff.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
};
