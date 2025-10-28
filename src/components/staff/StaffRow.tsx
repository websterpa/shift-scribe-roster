
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
  console.log('🔄 StaffRow rendered for:', staff.first_name, staff.last_name, 'Status:', staff.availability_status);

  // Apply styling based on availability status
  const isUnavailable = staff.availability_status !== 'active';
  const rowClassName = `border-b hover:bg-gray-50 ${
    isUnavailable ? 'opacity-60 bg-gray-50' : ''
  }`;

  const textClassName = isUnavailable ? 'text-gray-500' : '';

  const getStatusBadge = () => {
    switch (staff.availability_status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active
          </span>
        );
      case 'temporarily_unavailable':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Temporarily Unavailable
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Inactive
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };

  return (
    <tr className={rowClassName}>
      <td className="py-3 px-4">
        <div className={`font-medium ${textClassName}`}>
          {staff.first_name} {staff.last_name}
          {(staff.wtd_opt_out ?? staff.opted_out_wtd ?? true) && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              WTD Opt-Out
            </span>
          )}
          {staff.availability_status === 'temporarily_unavailable' && staff.unavailability_reason && (
            <span className="ml-2 text-xs text-yellow-600 font-normal">
              ({staff.unavailability_reason})
            </span>
          )}
          {staff.availability_status === 'inactive' && (
            <span className="ml-2 text-xs text-gray-400 font-normal">(Inactive)</span>
          )}
        </div>
        <div className={`text-sm ${isUnavailable ? 'text-gray-400' : 'text-gray-500'}`}>
          {staff.email}
        </div>
        {staff.availability_status === 'temporarily_unavailable' && (
          <div className="text-xs text-gray-400 mt-1">
            {staff.unavailable_from && `From: ${staff.unavailable_from}`}
            {staff.expected_return_date && ` | Expected return: ${staff.expected_return_date}`}
          </div>
        )}
      </td>
      <td className={`py-3 px-4 ${textClassName}`}>{staff.employee_id}</td>
      <td className={`py-3 px-4 ${textClassName}`}>{staff.role}</td>
      <td className={`py-3 px-4 ${textClassName}`}>£{staff.hourly_rate}/hr</td>
      <td className={`py-3 px-4 ${textClassName}`}>
        <div className="text-sm">
          {staff.min_hours_per_week} - {staff.max_hours_per_week}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-1">
          {staff.eligible_shifts?.map((shift, index) => (
            <span
              key={index}
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                staff.availability_status === 'active'
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {shift}
            </span>
          )) || <span className="text-gray-400">None</span>}
        </div>
      </td>
      <td className="py-3 px-4">
        {getStatusBadge()}
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
            className={isUnavailable ? 'opacity-75' : ''}
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
            className={isUnavailable ? 'opacity-75' : ''}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
};
