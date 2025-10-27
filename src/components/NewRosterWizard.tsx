
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check, Settings } from 'lucide-react';
import { StaffMember } from '@/types/roster';
import { generateAndSaveRoster } from '@/utils/roster/generateAndSaveRoster';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from '@/hooks/use-toast';
import { 
  NewRosterWizardProps, 
  RosterConfig, 
  CustomPattern, 
  StaffingRequirements 
} from './NewRosterWizard/types';
import { COMMON_TEMPLATES } from './NewRosterWizard/constants';
import { WizardStep1 } from './NewRosterWizard/WizardStep1';
import { WizardStep2 } from './NewRosterWizard/WizardStep2';
import { WizardStep3 } from './NewRosterWizard/WizardStep3';
import { createTempConfig, cleanupTempConfig, isStepValid } from './NewRosterWizard/wizardUtils';

export function NewRosterWizard({ isOpen, onClose, onRosterGenerated, staffList }: NewRosterWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<RosterConfig>({
    shiftType: '8h',
    operationalWindow: '24h',
    template: '',
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
      const configId = await createTempConfig(config);
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

      console.log(`📊 NewRosterWizard: Using ${staffList.length} staff members for generation`);
      
      await generateAndSaveRoster(
        staffList, // Use all eligible staff members
        generationConfig,
        config.rosterName
      );

      console.log('✅ NewRosterWizard: Roster generated successfully');
      onRosterGenerated(configId); // Pass the temp config ID to parent for cleanup
      
    } catch (error) {
      console.error('❌ NewRosterWizard: Generation failed:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate roster",
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
            {currentStep === 1 && (
              <WizardStep1 
                config={config} 
                setConfig={setConfig} 
                staffList={staffList} 
              />
            )}
            {currentStep === 2 && (
              <WizardStep2 
                config={config} 
                setConfig={setConfig} 
                staffList={staffList} 
              />
            )}
            {currentStep === 3 && (
              <WizardStep3 
                config={config} 
                setConfig={setConfig} 
                staffList={staffList}
                customPatterns={customPatterns}
                isLoadingPatterns={isLoadingPatterns}
                isAuthenticated={isAuthenticated}
              />
            )}
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
                  disabled={!isStepValid(currentStep, config)}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleGenerateRoster}
                  disabled={!isStepValid(currentStep, config) || isGenerating}
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
