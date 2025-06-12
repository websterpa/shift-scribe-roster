
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Settings, BarChart3 } from 'lucide-react';
import { MultiWeekRoster } from '@/components/roster/MultiWeekRoster';
import { NewRosterWizard } from '@/components/NewRosterWizard';
import { PatternsPanel } from '@/components/PatternsPanel';
import { ComplianceDrawer } from '@/components/ComplianceDrawer';
import { ActionsFAB } from '@/components/ActionsFAB';
import { supabase } from '@/integrations/supabase/client';
import { fetchStaffMembers } from '@/utils/roster/rosterGeneration';
import { StaffMember } from '@/types/roster';
import { toast } from '@/hooks/use-toast';

interface LatestRoster {
  id: string;
  version_name: string;
  config_id: string;
  generated_at: string;
  assignmentCount: number;
}

const Dashboard = () => {
  const [latestRoster, setLatestRoster] = useState<LatestRoster | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewRosterWizard, setShowNewRosterWizard] = useState(false);
  const [showPatternsPanel, setShowPatternsPanel] = useState(false);
  const [showComplianceDrawer, setShowComplianceDrawer] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    console.log('📊 Dashboard: Loading dashboard data...');
    try {
      setIsLoading(true);
      
      // Load staff and latest roster in parallel
      const [staffData, rosterData] = await Promise.all([
        fetchStaffMembers(),
        fetchLatestRoster()
      ]);
      
      setStaffList(staffData);
      setLatestRoster(rosterData);
      
      console.log('✅ Dashboard: Data loaded successfully', {
        staffCount: staffData.length,
        hasRoster: !!rosterData
      });
    } catch (error) {
      console.error('❌ Dashboard: Error loading data:', error);
      toast({
        title: "Error loading dashboard",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLatestRoster = async (): Promise<LatestRoster | null> => {
    console.log('📥 Dashboard: Fetching latest roster...');
    
    const { data: versions, error: versionsError } = await supabase
      .from('roster_versions')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(1);

    if (versionsError) {
      console.error('❌ Dashboard: Error fetching roster versions:', versionsError);
      return null;
    }

    if (!versions || versions.length === 0) {
      console.log('📋 Dashboard: No roster versions found');
      return null;
    }

    const latestVersion = versions[0];
    
    // Count assignments for this version
    const { count, error: countError } = await supabase
      .from('roster_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('version_id', latestVersion.id);

    if (countError) {
      console.error('❌ Dashboard: Error counting assignments:', countError);
    }

    const result = {
      id: latestVersion.id,
      version_name: latestVersion.version_name || 'Untitled Roster',
      config_id: latestVersion.config_id,
      generated_at: latestVersion.generated_at,
      assignmentCount: count || 0
    };

    console.log('✅ Dashboard: Latest roster found:', result);
    return result;
  };

  const handleRosterGenerated = () => {
    console.log('🔄 Dashboard: Roster generated, reloading data...');
    setShowNewRosterWizard(false);
    loadDashboardData();
    toast({
      title: "Roster generated successfully",
      description: "Your new roster is now available",
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roster Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your shift rosters and view operational insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {staffList.length} Staff Members
          </Badge>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          onClick={() => setShowNewRosterWizard(true)}
          className="h-16 flex flex-col items-center justify-center gap-2"
          size="lg"
        >
          <Plus className="h-6 w-6" />
          <span>New Roster</span>
        </Button>
        
        <Button
          variant="outline"
          onClick={() => setShowPatternsPanel(true)}
          className="h-16 flex flex-col items-center justify-center gap-2"
          size="lg"
        >
          <Settings className="h-6 w-6" />
          <span>Saved Patterns</span>
        </Button>
        
        <Button
          variant="outline"
          onClick={() => setShowComplianceDrawer(true)}
          className="h-16 flex flex-col items-center justify-center gap-2"
          size="lg"
        >
          <FileText className="h-6 w-6" />
          <span>Compliance & Reports</span>
        </Button>
      </div>

      {/* Current Roster Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current Roster</span>
            {latestRoster && (
              <Badge variant="secondary">
                {latestRoster.assignmentCount} Assignments
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {latestRoster ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <h3 className="font-semibold">{latestRoster.version_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Generated {new Date(latestRoster.generated_at).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
              
              <MultiWeekRoster 
                staffList={staffList}
                config={null}
                showWeeks={4}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mb-4">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No roster yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first roster to get started with shift management
              </p>
              <Button onClick={() => setShowNewRosterWizard(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Roster
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals and Panels */}
      <NewRosterWizard
        isOpen={showNewRosterWizard}
        onClose={() => setShowNewRosterWizard(false)}
        onRosterGenerated={handleRosterGenerated}
        staffList={staffList}
      />

      <PatternsPanel
        isOpen={showPatternsPanel}
        onClose={() => setShowPatternsPanel(false)}
        onPatternSelected={(pattern) => {
          console.log('📋 Dashboard: Pattern selected:', pattern);
          // Could open new roster wizard with pattern pre-selected
        }}
      />

      <ComplianceDrawer
        isOpen={showComplianceDrawer}
        onClose={() => setShowComplianceDrawer(false)}
        rosterId={latestRoster?.id}
      />

      {/* Floating Action Button */}
      <ActionsFAB
        onNewRoster={() => setShowNewRosterWizard(true)}
        onOpenPatterns={() => setShowPatternsPanel(true)}
        onOpenCompliance={() => setShowComplianceDrawer(true)}
      />
    </div>
  );
};

export default Dashboard;
