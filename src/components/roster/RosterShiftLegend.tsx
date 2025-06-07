
import React from 'react';

export const RosterShiftLegend = () => {
  const getShiftColor = (shiftCode: string) => {
    switch (shiftCode) {
      case 'D': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'E': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'L': return 'bg-green-100 text-green-800 border-green-200';
      case 'N': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'R': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'S': return 'bg-red-100 text-red-800 border-red-200';
      case 'AL': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'T': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'OT': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-50 text-gray-500 border-gray-200';
    }
  };

  const shiftTypes = [
    { code: 'D', label: 'Day Shift' },
    { code: 'N', label: 'Night Shift' },
    { code: 'L', label: 'Late/Evening' },
    { code: 'R', label: 'Rest Day' },
    { code: 'T', label: 'Training' },
    { code: 'S', label: 'Sick Leave' },
    { code: 'AL', label: 'Annual Leave' },
    { code: 'OT', label: 'Overtime' },
    { code: 'E', label: 'Early' }
  ];

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
      <h4 className="font-medium mb-3">Shift Type Legend</h4>
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 text-xs">
        {shiftTypes.map(({ code, label }) => (
          <div key={code} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded flex items-center justify-center font-medium ${getShiftColor(code)}`}>
              {code}
            </div>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
