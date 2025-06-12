
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Check, Settings, Star, Users } from 'lucide-react';
import { StaffMember } from '@/types/roster';
import { generateAndSaveRoster } from '@/utils/roster/rosterGeneration';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from '@/hooks/use-toast';

interface NewRosterWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onRosterGenerated: (tempConfigId?: string) => void;
  staffList: StaffMember[];
}

interface StaffingRequirements {
  day_shift_staff: number;
  night_shift_staff: number;
  early_shift_staff?: number;
  late_shift_staff?: number;
}

interface RosterConfig {
  shiftType: '8h' | '12h';
  operationalWindow: '16h' | '24h' | 'custom';
  customHours?: number;
  template: string;
  staffCount: number;
  cycleLength: number;
  startDate: string;
  rosterName: string;
  staffingRequirements: StaffingRequirements;
}

interface CustomPattern {
  id: string;
  name: string;
  pattern: string[];
  shift_type: '8h' | '12h';
  created_at: string;
}

const COMMON_TEMPLATES = {
  '8h': [
    { id: 'continental', name: 'Continental (7-day)', pattern: ['D', 'D', 'R', 'R', 'R', 'N', 'N'] },
    { id: '4-on-4-off', name: '4-On/4-Off', pattern: ['D', 'D', 'D', 'D', 'R', 'R', 'R', 'R'] },
    { id: '5-2-standard', name: '5-2 Standard', pattern: ['D', 'D', 'D', 'D', 'D', 'R', 'R'] }
  ],
  '12h': [
    { id: 'dupont', name: 'DuPont (14-day)', pattern: ['D', 'D', 'D', 'D', 'R', 'R', 'R', 'N', 'N', 'N', 'N', 'R', 'R', 'R'] },
    { id: 'day-night-2-crew', name: 'Day/Night 2-Crew', pattern: ['D', 'D', 'D', 'D', 'R', 'R', 'R', 'R', 'N', 'N', 'N', 'N', 'R', 'R', 'R', 'R'] },
    { id: '3-4-3-weekend', name: '3-4-3 Weekend-Balanced', pattern: ['D', 'D', 'D', 'R', 'R', 'R', 'R', 'N', 'N', 'N'] }
  ]
};

export function NewRosterWizard({ isOpen, onClose, onRosterGenerated, staffList }: NewRosterWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<RosterConfig>({
    shiftType: '8h',
    operationalWindow: '24h',
    template: '',
    staffCount: staffList.length,
    cycleLength: 7,
    startDate: new Date().toISOString().split('T')[0],
    rosterName: '',
    staffingRequirements: {
      day_shift_staff: 2,
      night_shift_staff: 2,
      early_shift_staff: 1,
      late_shift_staff: 1
    }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPatterns, setCustomPatterns] = useState<CustomPattern[]>([]);
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(false);
  const [tempConfigId, setTempConfigId] = useState<string | null>(null);
  
  const { user, isAuthenticated } = useSupabaseAuth();

  useEffect(() => {
    if (isOpen) {
      // Reset wizard state when opened
      setCurrentStep(1);
      setConfig(prev => ({
        ...prev,
        staffCount: staffList.length,
        rosterName: `Roster - ${new Date().toLocaleDateString()}`
      }));
      
      // Load custom patterns for authenticated users
      if (isAuthenticated && user) {
        loadCustomPatterns();
      }
    }
  }, [isOpen, staffList.length, isAuthenticated, user]);

  // Reload custom patterns when shift type changes
  useEffect(() => {
    if (isOpen && isAuthenticated && user) {
      loadCustomPatterns();
    }
  }, [config.shiftType, isOpen, isAuthenticated, user]);

  const loadCustomPatterns = async () => {
    if (!user) return;
    
    console.log('📥 NewRosterWizard: Loading custom patterns for shift type:', config.shiftType);
    setIsLoadingPatterns(true);
    
    try {
      const { data, error } = await supabase
        .from('custom_patterns')
        .select('*')
        .eq('user_id', user.id)
        .eq('shift_type', config.shiftType)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ NewRosterWizard: Error loading custom patterns:', error);
        toast({
          title: "Error loading patterns",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ NewRosterWizard: Loaded custom patterns:', data);
      setCustomPatterns((data || []) as CustomPattern[]);
    } catch (error) {
      console.error('❌ NewRosterWizard: Exception loading custom patterns:', error);
      toast({
        title: "Error loading patterns",
        description: "Failed to load custom patterns",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPatterns(false);
    }
  };

  const createTempConfig = async (): Promise<string> => {
    console.log('📋 NewRosterWizard: Creating temporary config for wizard generation');
    
    try {
      const tempConfig = {
        config_name: `Wizard Temp Config - ${Date.now()}`,
        cycle_length_weeks: Math.ceil(config.cycleLength / 7),
        shift_type: config.shiftType,
        operational_hours_per_day: config.operationalWindow === '24h' ? 24 : 
                                   config.operationalWindow === '16h' ? 16 : 
                                   config.customHours || 24,
        handshake_minutes: 15,
        start_date: config.startDate,
        staffing_requirements: config.staffingRequirements as any
      };

      const { data, error } = await supabase
        .from('roster_config')
        .insert(tempConfig)
        .select('id')
        .single();

      if (error) {
        console.error('❌ NewRosterWizard: Error creating temp config:', error);
        throw error;
      }

      if (!data?.id) {
        throw new Error('Failed to get temp config ID');
      }

      console.log('✅ NewRosterWizard: Created temp config with ID:', data.id);
      return data.id;
    } catch (error: any) {
      console.error('❌ NewRosterWizard: Failed to create temp config:', error);
      throw new Error(`Failed to create temporary configuration: ${error.message}`);
    }
  };

  const cleanupTempConfig = async (configId: string) => {
    try {
      console.log('🧹 NewRosterWizard: Cleaning up temp config:', configId);
      await supabase
        .from('roster_config')
        .delete()
        .eq('id', configId);
      console.log('✅ NewRosterWizard: Temp config cleaned up');
    } catch (error) {
      console.error('❌ NewRosterWizard: Error cleaning up temp config:', error);
      // Non-critical error, don't throw
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerateRoster = async () => {
    console.log('🚀 NewRosterWizard: Starting roster generation...', config);
    
    if (!config.template) {
      toast({
        title: "Template required",
        description: "Please select a shift template",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);

      // Create temporary config
      const configId = await createTempConfig();
      setTempConfigId(configId);

      // Get the selected template pattern
      let selectedTemplate;
      let patternToUse;

      // Check if it's a custom pattern
      if (config.template.startsWith('custom-')) {
        const patternId = config.template.replace('custom-', '');
        selectedTemplate = customPatterns.find(p => p.id === patternId);
        patternToUse = selectedTemplate?.pattern;
      } else {
        // Standard template
        const templates = COMMON_TEMPLATES[config.shiftType];
        selectedTemplate = templates.find(t => t.id === config.template);
        patternToUse = selectedTemplate?.pattern;
      }
      
      if (!selectedTemplate || !patternToUse) {
        throw new Error('Selected template not found');
      }

      // Create a basic config for generation
      const generationConfig = {
        id: configId, // Use the actual temp config ID
        cycle_length_weeks: Math.ceil(config.cycleLength / 7),
        shift_type: config.shiftType,
        operational_hours_per_day: config.operationalWindow === '24h' ? 24 : 
                                   config.operationalWindow === '16h' ? 16 : 
                                   config.customHours || 24,
        handshake_minutes: 15,
        start_date: config.startDate,
        pattern: patternToUse
      };

      console.log('📊 NewRosterWizard: Generation config:', generationConfig);

      await generateAndSaveRoster(
        staffList.slice(0, config.staffCount), // Use only the specified number of staff
        generationConfig,
        config.rosterName
      );

      console.log('✅ NewRosterWizard: Roster generated successfully');
      onRosterGenerated(configId); // Pass the temp config ID to parent for cleanup
      
    } catch (error: any) {
      console.error('❌ NewRosterWizard: Generation failed:', error);
      toast({
        title: "Generation failed",
        description: error?.message || "Failed to generate roster",
        variant: "destructive",
      });
      
      // Cleanup temp config on error
      if (tempConfigId) {
        await cleanupTempConfig(tempConfigId);
        setTempConfigId(null);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const updateStaffingRequirement = (field: keyof StaffingRequirements, value: number) => {
    setConfig(prev => ({
      ...prev,
      staffingRequirements: {
        ...prev.staffingRequirements,
        [field]: value
      }
    }));
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return config.shiftType && config.operationalWindow;
      case 2:
        return config.staffCount > 0 && config.cycleLength > 0;
      case 3:
        return config.template && config.rosterName.trim();
      default:
        return false;
    }
  };

  const getShiftCodeColor = (code: string) => {
    const colors = {
      'D': 'bg-yellow-100 text-yellow-800',
      'E': 'bg-blue-100 text-blue-800',
      'L': 'bg-orange-100 text-orange-800',
      'N': 'bg-purple-100 text-purple-800',
      'R': 'bg-gray-100 text-gray-800'
    };
    return colors[code as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Shift Basics</h3>
        
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Shift Length</Label>
            <RadioGroup
              value={config.shiftType}
              onValueChange={(value: '8h' | '12h') => setConfig(prev => ({ ...prev, shiftType: value, template: '' }))}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="8h" id="8h" />
                <Label htmlFor="8h">8-Hour Shifts</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="12h" id="12h" />
                <Label htmlFor="12h">12-Hour Shifts</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-base font-medium">Operational Window</Label>
            <RadioGroup
              value={config.operationalWindow}
              onValueChange={(value: '16h' | '24h' | 'custom') => setConfig(prev => ({ ...prev, operationalWindow: value }))}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="24h" id="24h" />
                <Label htmlFor="24h">24 Hours (24/7 Operation)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="16h" id="16h" />
                <Label htmlFor="16h">16 Hours (Day/Evening Only)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom">Custom Hours</Label>
              </div>
            </RadioGroup>
          </div>

          {config.operationalWindow === 'custom' && (
            <div>
              <Label htmlFor="customHours">Hours per Day</Label>
              <Input
                id="customHours"
                type="number"
                min="8"
                max="24"
                value={config.customHours || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, customHours: parseInt(e.target.value) || undefined }))}
                placeholder="Enter hours per day"
                className="mt-1"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Staff & Cycle Configuration</h3>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="staffCount" className="text-base font-medium">Number of Staff</Label>
              <Input
                id="staffCount"
                type="number"
                min="1"
                max={staffList.length}
                value={config.staffCount}
                onChange={(e) => setConfig(prev => ({ ...prev, staffCount: parseInt(e.target.value) || 0 }))}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Available: {staffList.length} staff members
              </p>
            </div>

            <div>
              <Label htmlFor="cycleLength" className="text-base font-medium">Cycle Length (Days)</Label>
              <Select value={config.cycleLength.toString()} onValueChange={(value) => setConfig(prev => ({ ...prev, cycleLength: parseInt(value) }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Days (1 Week)</SelectItem>
                  <SelectItem value="14">14 Days (2 Weeks)</SelectItem>
                  <SelectItem value="28">28 Days (4 Weeks)</SelectItem>
                  <SelectItem value="35">35 Days (5 Weeks)</SelectItem>
                  <SelectItem value="42">42 Days (6 Weeks)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="startDate" className="text-base font-medium">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={config.startDate}
              onChange={(e) => setConfig(prev => ({ ...prev, startDate: e.target.value }))}
              className="mt-1"
            />
          </div>

          {/* Shift Staffing Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Shift Staffing Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {config.shiftType === '12h' ? (
                  <>
                    <div>
                      <Label htmlFor="day_shift_staff">Day Shift Staff</Label>
                      <Input
                        id="day_shift_staff"
                        type="number"
                        min="1"
                        value={config.staffingRequirements.day_shift_staff}
                        onChange={(e) => updateStaffingRequirement('day_shift_staff', parseInt(e.target.value) || 1)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="night_shift_staff">Night Shift Staff</Label>
                      <Input
                        id="night_shift_staff"
                        type="number"
                        min="1"
                        value={config.staffingRequirements.night_shift_staff}
                        onChange={(e) => updateStaffingRequirement('night_shift_staff', parseInt(e.target.value) || 1)}
                        className="mt-1"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="early_shift_staff">Early Shift Staff</Label>
                      <Input
                        id="early_shift_staff"
                        type="number"
                        min="1"
                        value={config.staffingRequirements.early_shift_staff || 1}
                        onChange={(e) => updateStaffingRequirement('early_shift_staff', parseInt(e.target.value) || 1)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="late_shift_staff">Late Shift Staff</Label>
                      <Input
                        id="late_shift_staff"
                        type="number"
                        min="1"
                        value={config.staffingRequirements.late_shift_staff || 1}
                        onChange={(e) => updateStaffingRequirement('late_shift_staff', parseInt(e.target.value) || 1)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="night_shift_staff_8h">Night Shift Staff</Label>
                      <Input
                        id="night_shift_staff_8h"
                        type="number"
                        min="1"
                        value={config.staffingRequirements.night_shift_staff}
                        onChange={(e) => updateStaffingRequirement('night_shift_staff', parseInt(e.target.value) || 1)}
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Set how many staff members are required to work each shift type to ensure adequate coverage.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => {
    // Filter templates based on shift type
    const templates = COMMON_TEMPLATES[config.shiftType];
    const filteredCustomPatterns = customPatterns.filter(p => p.shift_type === config.shiftType);
    
    const getSelectedPattern = () => {
      if (config.template.startsWith('custom-')) {
        const patternId = config.template.replace('custom-', '');
        return filteredCustomPatterns.find(p => p.id === patternId);
      } else {
        return templates.find(t => t.id === config.template);
      }
    };

    const selectedPattern = getSelectedPattern();

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Preview & Generate</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="rosterName" className="text-base font-medium">Roster Name</Label>
              <Input
                id="rosterName"
                value={config.rosterName}
                onChange={(e) => setConfig(prev => ({ ...prev, rosterName: e.target.value }))}
                placeholder="Enter roster name"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-base font-medium">Shift Template</Label>
              
              {/* My Saved Patterns Section */}
              {isAuthenticated && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">My Saved Patterns ({config.shiftType})</span>
                  </div>
                  
                  {isLoadingPatterns ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-xs text-muted-foreground">Loading patterns...</p>
                    </div>
                  ) : filteredCustomPatterns.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {filteredCustomPatterns.map((pattern) => (
                        <Card 
                          key={pattern.id}
                          className={`cursor-pointer transition-colors ${
                            config.template === `custom-${pattern.id}` ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => setConfig(prev => ({ ...prev, template: `custom-${pattern.id}` }))}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Star className="h-3 w-3 text-yellow-500" />
                                  <p className="font-medium text-sm">{pattern.name}</p>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {pattern.pattern.length}-day cycle
                                </p>
                              </div>
                              <div className="flex gap-1">
                                {pattern.pattern.slice(0, 7).map((code, index) => (
                                  <Badge key={index} variant="outline" className={`text-xs ${getShiftCodeColor(code)}`}>
                                    {code}
                                  </Badge>
                                ))}
                                {pattern.pattern.length > 7 && <span className="text-xs text-muted-foreground">...</span>}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-4">No saved patterns for {config.shiftType} shifts</p>
                  )}
                </div>
              )}

              {/* Standard Templates Section */}
              <div className="mt-4">
                <span className="text-sm font-medium">Standard Templates ({config.shiftType})</span>
                <div className="mt-2 space-y-2">
                  {templates.map((template) => (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer transition-colors ${
                        config.template === template.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setConfig(prev => ({ ...prev, template: template.id }))}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{template.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {template.pattern.length}-day cycle
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {template.pattern.slice(0, 7).map((code, index) => (
                              <Badge key={index} variant="outline" className={`text-xs ${getShiftCodeColor(code)}`}>
                                {code}
                              </Badge>
                            ))}
                            {template.pattern.length > 7 && <span className="text-xs text-muted-foreground">...</span>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {selectedPattern && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    Pattern Preview
                    {config.template.startsWith('custom-') && <Star className="h-4 w-4 text-yellow-500" />}
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedPattern.pattern.map((code, index) => (
                      <Badge key={index} variant="secondary" className={getShiftCodeColor(code)}>
                        Day {index + 1}: {code}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            New Roster Wizard
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === currentStep ? 'bg-primary text-primary-foreground' :
                  step < currentStep ? 'bg-primary/20 text-primary' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {step < currentStep ? <Check className="h-4 w-4" /> : step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    step < currentStep ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              
              {currentStep < 3 ? (
                <Button
                  onClick={handleNext}
                  disabled={!isStepValid()}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleGenerateRoster}
                  disabled={!isStepValid() || isGenerating}
                >
                  {isGenerating ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </div>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Generate Roster
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
