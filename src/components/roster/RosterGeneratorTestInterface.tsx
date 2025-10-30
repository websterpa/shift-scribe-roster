import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { generateRoster, getDefaultRatePolicy, getDefaultRestRules, getDefaultGeneratorConfig } from '@/services/roster/helpers/rosterGeneration';
import { supabase } from '@/integrations/supabase/client';

/**
 * Simple test interface for the new engine2-based roster generator
 * This validates that requirements can be loaded and assignments inserted
 */
export function RosterGeneratorTestInterface() {
  const [loading, setLoading] = useState(false);
  const [versionId, setVersionId] = useState('');
  const [monthISO, setMonthISO] = useState('2025-09');
  const [requirements, setRequirements] = useState(`{
  "days": {
    "2025-09-01": [
      {
        "role_id": "STAFF",
        "site_id": "MAIN",
        "start": "2025-09-01T08:00:00",
        "end": "2025-09-01T16:00:00",
        "needed": 2
      },
      {
        "role_id": "STAFF", 
        "site_id": "MAIN",
        "start": "2025-09-01T22:00:00",
        "end": "2025-09-02T06:00:00",
        "needed": 1
      }
    ],
    "2025-09-02": [
      {
        "role_id": "STAFF",
        "site_id": "MAIN", 
        "start": "2025-09-02T08:00:00",
        "end": "2025-09-02T16:00:00",
        "needed": 2
      }
    ]
  }
}`);
  const [result, setResult] = useState<any>(null);

  const handleCreateTestVersion = async () => {
    try {
      setLoading(true);
      
      // 1. Create a test roster config with the requirements
      const { data: configData, error: configErr } = await supabase
        .from('roster_config')
        .insert({
          config_name: 'Test Engine2 Config',
          shift_type: '12h',
          cycle_length_weeks: 4,
          operational_hours_per_day: 24,
          start_date: '2025-09-01',
          staffing_requirements: JSON.parse(requirements)
        })
        .select('id')
        .single();
        
      if (configErr) throw configErr;
      
      // 2. Create a roster version
      const { data: versionData, error: versionErr } = await supabase
        .from('roster_versions')
        .insert({
          config_id: configData.id,
          tenant_id: '00000000-0000-0000-0000-000000000001',
          version_name: 'Engine2 Test Version',
          version_number: 1
        })
        .select('id')
        .single();
        
      if (versionErr) throw versionErr;
      
      setVersionId(versionData.id);
      toast({
        title: 'Test version created',
        description: `Version ID: ${versionData.id}`,
      });
      
    } catch (error: any) {
      toast({
        title: 'Error creating test version',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRoster = async () => {
    if (!versionId) {
      toast({
        title: 'No version ID',
        description: 'Please create a test version first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const summary = await generateRoster({
        supabase,
        rosterVersionId: versionId,
        monthISO,
        ratePolicy: getDefaultRatePolicy(),
        restRules: getDefaultRestRules(),
        holidays: [
          { dateISO: '2025-09-15', isPublicHoliday: true }
        ],
        config: getDefaultGeneratorConfig(),
      });
      
      setResult(summary);
      
      toast({
        title: 'Roster generated successfully!',
        description: `${summary.assignmentsInserted} assignments created`,
      });
      
    } catch (error: any) {
      toast({
        title: 'Generation failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Engine2 Roster Generator Test</CardTitle>
          <CardDescription>
            Test the new deterministic roster generator with engine2 primitives
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="monthISO">Month (YYYY-MM)</Label>
              <Input
                id="monthISO"
                value={monthISO}
                onChange={(e) => setMonthISO(e.target.value)}
                placeholder="2025-09"
              />
            </div>
            <div>
              <Label htmlFor="versionId">Version ID</Label>
              <Input
                id="versionId"
                value={versionId}
                onChange={(e) => setVersionId(e.target.value)}
                placeholder="Will be set after creating test version"
                readOnly
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="requirements">Staffing Requirements JSON</Label>
            <Textarea
              id="requirements"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={15}
              className="font-mono text-sm"
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleCreateTestVersion}
              disabled={loading}
            >
              1. Create Test Version
            </Button>
            <Button 
              onClick={handleGenerateRoster}
              disabled={loading || !versionId}
              variant="secondary"
            >
              2. Generate Roster
            </Button>
          </div>
          
          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Generation Results</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-4 rounded">
                  {JSON.stringify(result, null, 2)}
                </pre>
                {result.assignmentsInserted > 0 && (
                  <p className="mt-2 text-sm text-green-600">
                    ✅ Successfully inserted {result.assignmentsInserted} assignments. 
                    Check the Monthly Schedule tab to see them!
                  </p>
                )}
                {result.rejected?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-orange-600">
                      ⚠️ {result.rejected.length} requirements were rejected:
                    </p>
                    <ul className="text-xs text-orange-600 ml-4">
                      {result.rejected.map((r: any, i: number) => (
                        <li key={i}>• {r.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}