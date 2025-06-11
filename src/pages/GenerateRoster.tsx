
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, Users, Calendar, TestTube, TrendingUp } from 'lucide-react';
import { RosterGenerationSettings } from '@/components/roster/RosterGenerationSettings';
import { ShiftCycleTestInterface } from '@/components/roster/ShiftCycleTestInterface';
import { CycleValidationTestInterface } from '@/components/roster/CycleValidationTestInterface';
import { PatternSelector } from '@/components/roster/PatternSelector';
import { useRosterGeneration } from '@/hooks/useRosterGeneration';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CustomPattern {
  id: string;
  name: string;
  shift_type: '8h' | '12h';
  pattern: string[];
  created_at: string;
}

const GenerateRoster = () => {
  const [activeTab, setActiveTab] = useState("settings");
  const [selectedPattern, setSelectedPattern] = useState<string[]>([]);
  const [patternName, setPatternName] = useState('');
  const [customPatterns, setCustomPatterns] = useState<CustomPattern[]>([]);
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(false);
  
  const { user, isAuthenticated } = useSupabaseAuth();
  
  const {
    configs,
    selectedConfigId,
    selectedConfig,
    rosterName,
    staffList,
    isGenerating,
    isLoading,
    generatedVersionId,
    errors,
    setSelectedConfigId,
    setRosterName,
    handleGenerateRoster: originalHandleGenerateRoster,
    refreshData,
    validationReport,
    isValidating
  } = useRosterGeneration(null);

  // Load custom patterns when user changes or selected config changes
  useEffect(() => {
    if (isAuthenticated && user && selectedConfig) {
      loadCustomPatterns();
    }
  }, [isAuthenticated, user, selectedConfig?.shift_type]);

  const loadCustomPatterns = async () => {
    if (!user || !selectedConfig) return;
    
    console.log('📥 GenerateRoster: Loading custom patterns for shift type:', selectedConfig.shift_type);
    setIsLoadingPatterns(true);
    
    try {
      const { data, error } = await supabase
        .from('custom_patterns')
        .select('*')
        .eq('user_id', user.id)
        .eq('shift_type', selectedConfig.shift_type)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ GenerateRoster: Error loading custom patterns:', error);
        toast({
          title: "Error loading patterns",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ GenerateRoster: Loaded custom patterns:', data);
      setCustomPatterns((data || []) as CustomPattern[]);
    } catch (error) {
      console.error('❌ GenerateRoster: Exception loading custom patterns:', error);
      toast({
        title: "Error loading patterns",
        description: "Failed to load custom patterns",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPatterns(false);
    }
  };

  // Enhanced roster generation that includes the selected pattern
  const handleGenerateRosterWithPattern = async () => {
    if (!selectedConfig) {
      toast({
        title: "No configuration selected",
        description: "Please select a roster configuration first",
        variant: "destructive",
      });
      return;
    }

    if (selectedPattern.length === 0) {
      toast({
        title: "No pattern selected",
        description: "Please select a shift pattern before generating the roster",
        variant: "destructive",
      });
      return;
    }

    console.log('🚀 GenerateRoster: Starting generation with pattern', { 
      pattern: selectedPattern, 
      patternLength: selectedPattern.length 
    });

    try {
      // Create enhanced config with the selected pattern
      const enhancedConfig = {
        ...selectedConfig,
        pattern: selectedPattern
      };

      // Call the original generation function with the enhanced config
      await originalHandleGenerateRoster();
      
      console.log('✅ GenerateRoster: Generation completed successfully');
    } catch (error: any) {
      console.error('❌ GenerateRoster: Generation failed:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate roster with selected pattern",
        variant: "destructive",
      });
    }
  };

  const handlePatternChange = (pattern: string[]) => {
    console.log('📊 GenerateRoster: Pattern changed', pattern);
    setSelectedPattern(pattern);
  };

  const handleShiftLengthChange = (length: '8h' | '12h') => {
    console.log('⏰ GenerateRoster: Shift length changed, clearing pattern', length);
    setSelectedPattern([]);
    setPatternName('');
  };

  const isGenerateDisabled = !selectedConfig || selectedPattern.length === 0 || isGenerating || staffList.length === 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generate Roster</h1>
          <p className="text-muted-foreground">
            Create optimized shift rosters with custom pattern selection
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
                Generate shift rosters using selected patterns and configurations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RosterGenerationSettings 
                configs={configs}
                selectedConfig={selectedConfig}
                selectedConfigId={selectedConfigId}
                rosterName={rosterName}
                staffCount={staffList.length}
                isGenerating={isGenerating}
                generatedVersionId={generatedVersionId}
                errors={errors}
                onSelectConfig={setSelectedConfigId}
                onRosterNameChange={setRosterName}
                onGenerateRoster={handleGenerateRosterWithPattern}
                onRefresh={refreshData}
              />

              {/* Pattern Selection Section */}
              {selectedConfig && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Select Shift Pattern</h3>
                  <PatternSelector
                    shiftLength={selectedConfig.shift_type}
                    onShiftLengthChange={handleShiftLengthChange}
                    selectedTemplate=""
                    onTemplateChange={() => {}}
                    customPattern={[]}
                    onCustomPatternChange={() => {}}
                    patternArray={selectedPattern}
                    onPatternArrayChange={handlePatternChange}
                  />
                </div>
              )}

              {/* Generate Button Override */}
              {selectedConfig && (
                <div className="border-t pt-6">
                  <Button 
                    onClick={handleGenerateRosterWithPattern}
                    disabled={isGenerateDisabled}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating Roster...
                      </div>
                    ) : (
                      `Generate Roster${selectedPattern.length > 0 ? ` with ${selectedPattern.length}-day pattern` : ''}`
                    )}
                  </Button>
                  {selectedPattern.length === 0 && selectedConfig && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      Please select a shift pattern to enable generation
                    </p>
                  )}
                </div>
              )}
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
