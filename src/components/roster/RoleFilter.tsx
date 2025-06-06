
import React from 'react';
import { Filter } from 'lucide-react';

interface RoleFilterProps {
  filterRole: string;
  setFilterRole: (role: string) => void;
  availableRoles: string[];
}

export function RoleFilter({ 
  filterRole, 
  setFilterRole, 
  availableRoles 
}: RoleFilterProps) {
  return (
    <div className="relative w-full sm:w-auto">
      <Filter className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <select 
        className="h-10 w-full sm:w-40 rounded-md border border-input bg-background pl-8 pr-8 text-sm"
        value={filterRole}
        onChange={(e) => setFilterRole(e.target.value)}
      >
        {availableRoles.map(role => (
          <option key={role} value={role}>
            {role === 'all' ? 'All roles' : role}
          </option>
        ))}
      </select>
    </div>
  );
}
