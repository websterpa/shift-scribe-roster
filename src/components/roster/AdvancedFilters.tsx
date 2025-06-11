
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Filter } from 'lucide-react';
import { RoleFilter } from '@/components/roster/RoleFilter';

interface AdvancedFiltersProps {
  isOpen: boolean;
  onToggle: () => void;
  filterRole: string;
  setFilterRole: (role: string) => void;
  availableRoles: string[];
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
}

export function AdvancedFilters({
  isOpen,
  onToggle,
  filterRole,
  setFilterRole,
  availableRoles,
  dateRange,
  setDateRange
}: AdvancedFiltersProps) {
  return (
    <div className="space-y-3">
      <Button 
        variant="outline" 
        onClick={onToggle}
        className="w-full sm:w-auto"
      >
        <Filter className="h-4 w-4 mr-2" />
        Advanced Filters
      </Button>

      {isOpen && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Role Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Role</label>
                <RoleFilter 
                  filterRole={filterRole}
                  setFilterRole={setFilterRole}
                  availableRoles={availableRoles}
                />
              </div>

              {/* Date Range */}
              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
