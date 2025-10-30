import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Search, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { createLogger } from '@/utils/errorLogger';

const logger = createLogger('AuditLog');

interface AuditEntry {
  id: string;
  shift_date: string;
  old_shift: string;
  new_shift: string;
  reason: string;
  severity: 'critical' | 'warning' | 'info';
  applied_at: string;
  staff_profiles?: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

const PAGE_SIZE = 25;

export const AuditLog = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchAuditEntries();
  }, [currentPage, searchQuery, severityFilter, startDate, endDate]);

  const fetchAuditEntries = async () => {
    try {
      setLoading(true);
      logger.info('[fetchAuditEntries] Starting fetch', {
        page: currentPage,
        searchQuery,
        severityFilter,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      });

      // Build query
      let query = supabase
        .from('correction_audit')
        .select(`
          id,
          shift_date,
          old_shift,
          new_shift,
          reason,
          severity,
          applied_at,
          staff_profiles (
            first_name,
            last_name,
            employee_id
          )
        `, { count: 'exact' });

      // Apply filters
      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      if (startDate) {
        query = query.gte('shift_date', format(startDate, 'yyyy-MM-dd'));
      }

      if (endDate) {
        query = query.lte('shift_date', format(endDate, 'yyyy-MM-dd'));
      }

      // Apply search filter (searching in reason or staff name will be done client-side after fetching)
      
      // Order and paginate
      query = query
        .order('applied_at', { ascending: false })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error('[fetchAuditEntries] Query failed', { error: error.message });
        throw error;
      }

      // Client-side search filter for staff name
      let filteredData = (data || []) as AuditEntry[];
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        filteredData = filteredData.filter(entry => {
          const staffName = entry.staff_profiles
            ? `${entry.staff_profiles.first_name} ${entry.staff_profiles.last_name}`.toLowerCase()
            : '';
          return staffName.includes(lowerQuery) || entry.reason.toLowerCase().includes(lowerQuery);
        });
      }

      setEntries(filteredData);
      setTotalCount(count || 0);
      logger.info('[fetchAuditEntries] Fetched successfully', {
        entriesCount: filteredData.length,
        totalCount: count
      });
    } catch (error) {
      logger.error('[fetchAuditEntries] Failed', { error });
      setEntries([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Critical
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Warning
          </Badge>
        );
      case 'info':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            Info
          </Badge>
        );
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Corrections History</CardTitle>
        <p className="text-sm text-muted-foreground">
          View all automatic corrections applied to rosters for compliance
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff or reason..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8"
            />
          </div>

          {/* Severity Filter */}
          <Select value={severityFilter} onValueChange={(value) => {
            setSeverityFilter(value);
            setCurrentPage(1);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="All Severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>

          {/* Start Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : 'Start date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  setStartDate(date);
                  setCurrentPage(1);
                }}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* End Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal',
                  !endDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP') : 'End date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => {
                  setEndDate(date);
                  setCurrentPage(1);
                }}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Clear Filters */}
        {(searchQuery || severityFilter !== 'all' || startDate || endDate) && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSeverityFilter('all');
                setStartDate(undefined);
                setEndDate(undefined);
                setCurrentPage(1);
              }}
            >
              Clear all filters
            </Button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading audit entries...</p>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8">
            <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No corrections found</h3>
            <p className="text-muted-foreground">
              {searchQuery || severityFilter !== 'all' || startDate || endDate
                ? 'Try adjusting your filters'
                : 'No automatic corrections have been applied yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Old Shift</TableHead>
                    <TableHead>New Shift</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Applied At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {format(new Date(entry.shift_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {entry.staff_profiles ? (
                          <div>
                            <p className="font-medium">
                              {entry.staff_profiles.first_name} {entry.staff_profiles.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.staff_profiles.employee_id}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.old_shift}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{entry.new_shift}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm truncate" title={entry.reason}>
                          {entry.reason}
                        </p>
                      </TableCell>
                      <TableCell>{getSeverityBadge(entry.severity)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(entry.applied_at), 'MMM dd, HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}

            {/* Results summary */}
            <div className="text-sm text-muted-foreground text-center">
              Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} entries
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
