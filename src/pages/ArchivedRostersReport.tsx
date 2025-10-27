import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Archive, Eye, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/utils/errorLogger';

const logger = createLogger('ArchivedRostersReport');

interface ArchivedRoster {
  id: string;
  tenant_id: string | null;
  month: string;
  archived_at: string;
  archived_by: string | null;
  reason: string | null;
}

const ArchivedRostersReport = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ArchivedRoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArchivedRosters = async () => {
      try {
        logger.info('Fetching archived rosters');
        
        const { data: archivedData, error: fetchError } = await supabase
          .from('archived_rosters')
          .select('id, tenant_id, month, archived_at, archived_by, reason')
          .order('archived_at', { ascending: false });

        if (fetchError) {
          logger.error(new Error('Failed to fetch archived rosters'), { error: fetchError });
          setError(fetchError.message);
          return;
        }

        setData(archivedData || []);
        logger.info('Archived rosters fetched successfully', { count: archivedData?.length || 0 });
      } catch (err) {
        logger.error(new Error('Unexpected error fetching archived rosters'), { error: err });
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchArchivedRosters();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/reports')}
          title="Back to Reports"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <Archive className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Archived Rosters</h1>
            <p className="text-sm text-muted-foreground">
              View and export previous roster versions
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Archived Roster History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground">Loading archived rosters...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 border border-destructive rounded-lg bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-destructive">{error}</span>
            </div>
          )}

          {!loading && !error && data.length === 0 && (
            <div className="text-center py-8">
              <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No archived rosters found</p>
            </div>
          )}

          {!loading && !error && data.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Tenant ID</TableHead>
                    <TableHead>Archived At</TableHead>
                    <TableHead>Archived By</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((roster) => (
                    <TableRow key={roster.id}>
                      <TableCell className="font-medium">{roster.month}</TableCell>
                      <TableCell>
                        {roster.tenant_id ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {roster.tenant_id.substring(0, 8)}...
                          </code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(roster.archived_at)}</TableCell>
                      <TableCell>
                        {roster.archived_by ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {roster.archived_by.substring(0, 8)}...
                          </code>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {roster.reason || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement view details
                            logger.info('View archived roster', { id: roster.id });
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ArchivedRostersReport;
