
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Check, Settings } from 'lucide-react';
import { StaffMember } from '@/types/roster';
import { generateAndSaveRoster } from '@/utils/roster/rosterGeneration';
import { toast } from '@/hooks/use-toast';

interface NewRosterWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onRosterGenerated: () => void;
  staffList: StaffMember[];
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
    rosterName: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset wizard state when opened
      setCurrentStep(1);
      setConfig(prev => ({
        ...prev,
        staffCount: staffList.length,
        rosterName: `Roster - ${new Date().toLocaleDateString()}`
      }));
    }
  }, [isOpen, staffList.length]);

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

  const handleGenerate = async () => {
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

      // Get the selected template pattern
      const templates = COMMON_TEMPLATES[config.shiftType];
      const selectedTemplate = templates.find(t => t.id === config.template);
      
      if (!selectedTemplate) {
        throw new Error('Selected template not found');
      }

      // Create a basic config for generation
      const generationConfig = {
        id: 'wizard-generated',
        cycle_length_weeks: Math.ceil(config.cycleLength / 7),
        shift_type: config.shiftType,
        operational_hours_per_day: config.operationalWindow === '24h' ? 24 : 
                                   config.operationalWindow === '16h' ? 16 : 
                                   config.customHours || 24,
        handshake_minutes: 15,
        start_date: config.startDate,
        pattern: selectedTemplate.pattern
      };

      console.log('📊 NewRosterWizard: Generation config:', generationConfig);

      await generateAndSaveRoster(
        staffList.slice(0, config.staffCount), // Use only the specified number of staff
        generationConfig,
        config.rosterName
      );

      console.log('✅ NewRosterWizard: Roster generated successfully');
      onRosterGenerated();
      
    } catch (error: any) {
      console.error('❌ NewRosterWizard: Generation failed:', error);
      toast({
        title: "Generation failed",
        description: error?.message || "Failed to generate roster",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
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
        <h3 className="text-lg font-semibold mb-4">Staff & Cycle</h3>
        
        <div className="space-y-4">
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
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => {
    const templates = COMMON_TEMPLATES[config.shiftType];
    const selectedTemplate = templates.find(t => t.id === config.template);

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
              <div className="mt-2 space-y-2">
                {templates.map((template) => (
                  <Card 
                    key={template.id}
                    className={`cursor-pointer transition-colors ${
                      config.template === template.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setConfig(prev => ({ ...prev, template: template.id }))}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {template.pattern.length}-day cycle
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {template.pattern.slice(0, 7).map((code, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {code}
                            </Badge>
                          ))}
                          {template.pattern.length > 7 && <span className="text-muted-foreground">...</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {selectedTemplate && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Pattern Preview</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedTemplate.pattern.map((code, index) => (
                      <Badge key={index} variant="secondary">
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
                  onClick={handleGenerate}
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
