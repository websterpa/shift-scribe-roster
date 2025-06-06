
import React from 'react';
import { SearchInput } from '@/components/roster/SearchInput';
import { RoleFilter } from '@/components/roster/RoleFilter';

interface RosterSearchFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterRole: string;
  setFilterRole: (role: string) => void;
  availableRoles: string[];
}

export function RosterSearchFilters({
  searchTerm,
  setSearchTerm,
  filterRole,
  setFilterRole,
  availableRoles
}: RosterSearchFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 pt-2">
      <SearchInput 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        placeholder="Search staff..."
      />
      <RoleFilter 
        filterRole={filterRole}
        setFilterRole={setFilterRole}
        availableRoles={availableRoles}
      />
    </div>
  );
}
