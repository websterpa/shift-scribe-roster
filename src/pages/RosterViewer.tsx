
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, Users, Clock, Printer, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { RosterViewerHeader } from '@/components/roster/RosterViewerHeader';
import { RosterCalendarTable } from '@/components/roster/RosterCalendarTable';
import { RosterPrintView } from '@/components/roster/RosterPrintView';

interface RosterAssignment {
  id: string;
  date: string;
  shift_code: string;
  shift_start: string | null;
  shift_end: string | null;
  hours: number | null;
  cost: number | null;
  staff_profiles: {
    first_name: string;
    last_name: string;
    role: string | null;
  } | null;
}

interface RosterData {
  id: string;
  version_name: string;
  version_number: number;
  generated_at: string;
  config: {
    config_name: string;
    shift_type: string;
    cycle_length_weeks: number;
    start_date: string;
    staffing_requirements?: {
      day_shift_staff?: number;
      night_shift_staff?: number;
      early_shift_staff?: number;
      late_shift_staff?: number;
    };
  } | null;
  assignments: RosterAssignment[];
}

const RosterViewer = () => {
  console.log('🔄 RosterViewer component rendered');
  
  const { rosterId } = useParams<{ rosterId: string }>();
  const navigate = useNavigate();
  const [rosterData, setRosterData] = useState<RosterData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (rosterId) {
      loadRosterData(rosterId);
    }
  }, [rosterId]);

  const loadRosterData = async (id: string) => {
    try {
      console.log('📊 Loading roster data for ID:', id);
      setLoading(true);

      // Fetch roster version with config and assignments
      const { data: rosterVersion, error: rosterError } = await supabase
        .from('roster_versions')
        .select(`
          id,
          version_name,
          version_number,
          generated_at,
          config:roster_config(
            config_name,
            shift_type,
            cycle_length_weeks,
            start_date,
            staffing_requirements
          )
        `)
        .eq('id', id)
        .single();

      if (rosterError) {
        console.error('❌ Error loading roster version:', rosterError);
        toast({
          title: "Error loading roster",
          description: rosterError.message,
          variant: "destructive",
        });
        return;
      }

      // Fetch assignments for this roster
      const { data: assignments, error: assignmentsError } = await supabase
        .from('roster_assignments')
        .select(`
          id,
          date,
          shift_code,
          shift_start,
          shift_end,
          hours,
          cost,
          staff_profiles:staff_id(
            first_name,
            last_name,
            role
          )
        `)
        .eq('version_id', id)
        .order('date', { ascending: true });

      if (assignmentsError) {
        console.error('❌ Error loading assignments:', assignmentsError);
        toast({
          title: "Error loading assignments",
          description: assignmentsError.message,
          variant: "destructive",
        });
        return;
      }

      const rosterData: RosterData = {
        ...rosterVersion,
        assignments: assignments || []
      };

      console.log('✅ Loaded roster data:', {
        name: rosterData.version_name,
        assignments: rosterData.assignments.length,
        config: rosterData.config,
        assignmentDetails: rosterData.assignments.slice(0, 3) // Log first 3 assignments for debugging
      });

      setRosterData(rosterData);
    } catch (error: any) {
      console.error('❌ Exception loading roster:', error);
      toast({
        title: "Error loading roster",
        description: "Failed to load roster data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // For now, show a toast - in a real implementation, you'd generate a PDF
    toast({
      title: "Download started",
      description: "Your roster PDF is being prepared for download",
    });
    
    // Use browser's print dialog as PDF generation
    setTimeout(() => {
      window.print();
    }, 500);
  };

  console.log('🔍 RosterViewer render state:', {
    loading,
    hasRosterData: !!rosterData,
    assignmentCount: rosterData?.assignments?.length || 0
  });

  if (loading) {
    return <LoadingState message="Loading roster data..." />;
  }

  if (!rosterData) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Roster not found</h3>
        <Button onClick={() => navigate('/my-rosters')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Rosters
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RosterViewerHeader rosterData={rosterData} onBack={() => navigate('/my-rosters')} />
      
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="print">Print/Download</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar" className="space-y-6">
          <RosterCalendarTable assignments={rosterData.assignments} />
        </TabsContent>
        
        <TabsContent value="print" className="space-y-6">
          <RosterPrintView 
            rosterData={rosterData} 
            onPrint={handlePrint}
            onDownload={handleDownload}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RosterViewer;
