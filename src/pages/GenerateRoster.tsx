
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, Users, Calendar, TestTube, TrendingUp } from 'lucide-react';
import { RosterGenerationSettings } from '@/components/roster/RosterGenerationSettings';
import { ShiftCycleTestInterface } from '@/components/roster/ShiftCycleTestInterface';
import { CycleValidationTestInterface } from '@/components/roster/CycleValidationTestInterface';
import { useRosterGeneration } from '@/hooks/useRosterGeneration';

const GenerateRoster = () => {
  const [activeTab, setActiveTab] = useState("settings");
  const { generateRoster, isGenerating } = useRosterGeneration();

  const handleGenerate = async (configId: string) => {
    try {
      await generateRoster(configId);
    } catch (error) {
      console.error('Failed to generate roster:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generate Roster</h1>
          <p className="text-muted-foreground">
            Create optimized shift rosters with rule-compliant cycle generation
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Enhanced Algorithm
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Generate Roster
          </TabsTrigger>
          <TabsTrigger value="cycle-test" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Cycle Testing
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Rule Validation
          </TabsTrigger>
          <TabsTrigger value="help" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Help
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Roster Generation
              </CardTitle>
              <CardDescription>
                Generate shift rosters using the enhanced rule-compliant algorithm
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RosterGenerationSettings onGenerate={handleGenerate} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cycle-test" className="space-y-6">
          <ShiftCycleTestInterface />
        </TabsContent>

        <TabsContent value="validation" className="space-y-6">
          <CycleValidationTestInterface />
        </TabsContent>

        <TabsContent value="help" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Roster Generation</CardTitle>
              <CardDescription>
                Understanding the 8 fundamental rules for compliant shift rosters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-green-600">✅ Rule 1: No Alternating Patterns</h4>
                  <p className="text-sm text-muted-foreground">
                    Never alternate rest/work day-by-day (avoiding RWRWRW patterns)
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-green-600">✅ Rule 2: Consecutive Work Blocks</h4>
                  <p className="text-sm text-muted-foreground">
                    Use 2-4 consecutive work shifts, followed by adequate rest
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-green-600">✅ Rule 3: Night Shift Rest</h4>
                  <p className="text-sm text-muted-foreground">
                    Night shifts must be followed by rest days for recovery
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-green-600">✅ Rule 4: No Late-Before-Early</h4>
                  <p className="text-sm text-muted-foreground">
                    In 8h mode, Late shifts cannot be immediately followed by Early shifts
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-green-600">✅ Rule 5: Group Identical Shifts</h4>
                  <p className="text-sm text-muted-foreground">
                    Group identical shift types together for consistency
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-green-600">✅ Rule 6: Weekly Work Limits</h4>
                  <p className="text-sm text-muted-foreground">
                    Maximum 5 work days in any 7-day rolling window
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-green-600">✅ Rule 7: Fair Weekend Distribution</h4>
                  <p className="text-sm text-muted-foreground">
                    Ensure fair distribution of weekend work among staff
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-green-600">✅ Rule 8: Adequate Rest Periods</h4>
                  <p className="text-sm text-muted-foreground">
                    Maintain adequate rest between shift blocks for work-life balance
                  </p>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-6">
                <h4 className="font-semibold mb-2">How to Use</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Use the "Cycle Testing" tab to experiment with pattern generation</li>
                  <li>Use the "Rule Validation" tab to test compliance with specific scenarios</li>
                  <li>Generate rosters from the main tab - enhanced cycles will be used automatically</li>
                  <li>Review generated rosters to ensure they meet your operational needs</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GenerateRoster;
