
import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
      <div className="relative flex-1">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search staff..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1.5 h-7 w-7 p-0"
            onClick={() => setSearchTerm("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
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
    </div>
  );
}
