import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Trash2, RotateCcw, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface PatternSelectorProps {
  shiftLength: '8h' | '12h';
  onShiftLengthChange: (length: '8h' | '12h') => void;
  selectedTemplate: string;
  onTemplateChange: (template: string) => void;
  customPattern: string[];
  onCustomPatternChange: (pattern: string[]) => void;
  patternArray: string[];
  onPatternArrayChange: (pattern: string[]) => void;
  handoverMinutes?: number;
  onHandoverChange?: (minutes: number) => void;
}

interface CustomPattern {
  id: string;
  name: string;
  shift_type: '8h' | '12h';
  pattern: string[];
  created_at: string;
}

const SHIFT_TEMPLATES = {
  '8h': {
    '2-2-3-panama': { name: '2-2-3 (Panama)', pattern: ['D', 'D', 'R', 'R', 'N', 'N', 'R'] },
    '4-on-4-off': { name: '4-On/4-Off', pattern: ['D', 'D', 'D', 'D', 'R', 'R', 'R', 'R'] },
    '5-2-standard': { name: '5-2 Standard', pattern: ['D', 'D', 'D', 'D', 'D', 'R', 'R'] },
    'continental': { name: 'Continental', pattern: ['D', 'D', 'R', 'R', 'R', 'N', 'N'] },
    'pitman': { name: 'Pitman', pattern: ['D', 'D', 'R', 'N', 'N', 'R', 'R'] },
    '3-3-5': { name: '3-3-5', pattern: ['D', 'D', 'D', 'R', 'R', 'R', 'N', 'N', 'N', 'R', 'R', 'R', 'R', 'R'] },
    '8-week-rotating': { name: '8-Week Rotating 8h', pattern: ['E', 'E', 'E', 'E', 'E', 'R', 'R', 'D', 'D', 'D', 'D', 'D', 'R', 'R'] }
  },
  '12h': {
    'dupont': { name: 'DuPont', pattern: ['D', 'D', 'D', 'D', 'R', 'R', 'R', 'N', 'N', 'N', 'N', 'R', 'R', 'R'] },
    '7-3-7-1': { name: '7-3-7-1', pattern: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'R', 'R', 'R', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'R'] },
    '5-5-5-2-2-2': { name: '5-5-5-2-2-2', pattern: ['D', 'D', 'D', 'D', 'D', 'R', 'R', 'N', 'N', 'N', 'N', 'N', 'R', 'R'] },
    '3-4-3-weekend': { name: '3-4-3 Weekend-Balanced', pattern: ['D', 'D', 'D', 'R', 'R', 'R', 'R', 'N', 'N', 'N'] },
    'day-night-2-crew': { name: 'Day/Night 2-Crew', pattern: ['D', 'D', 'D', 'D', 'R', 'R', 'R', 'R', 'N', 'N', 'N', 'N', 'R', 'R', 'R', 'R'] }
  }
};

const SHIFT_CODES = [
  { code: 'E', label: 'Early', color: 'bg-blue-100 text-blue-800' },
  { code: 'D', label: 'Day', color: 'bg-yellow-100 text-yellow-800' },
  { code: 'L', label: 'Late', color: 'bg-orange-100 text-orange-800' },
  { code: 'N', label: 'Night', color: 'bg-purple-100 text-purple-800' },
  { code: 'R', label: 'Rest', color: 'bg-gray-100 text-gray-800' }
];

export default function PatternSelector({
  shiftLength,
  onShiftLengthChange,
  selectedTemplate,
  onTemplateChange,
  customPattern,
  onCustomPatternChange,
  patternArray,
  onPatternArrayChange,
  handoverMinutes = 0,
  onHandoverChange
}: PatternSelectorProps) {
  console.log('🔄 PatternSelector rendered', { shiftLength, selectedTemplate, customPattern, patternArray, handoverMinutes });

  const [isCustomMode, setIsCustomMode] = useState(false);
  const [patternName, setPatternName] = useState('');
  const [customPatterns, setCustomPatterns] = useState<CustomPattern[]>([]);
  const [selectedCustomPattern, setSelectedCustomPattern] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { user, isAuthenticated } = useSupabaseAuth();

  const currentTemplates = SHIFT_TEMPLATES[shiftLength];

  // Load custom patterns on component mount and when shift length changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadCustomPatterns();
    }
  }, [isAuthenticated, user, shiftLength]);

  // Handle template selection and custom mode
  useEffect(() => {
    console.log('📊 PatternSelector: Template/mode sync', { selectedTemplate, isCustomMode });
    if (selectedTemplate === 'custom') {
      setIsCustomMode(true);
    } else if (selectedTemplate && selectedTemplate !== 'custom') {
      setIsCustomMode(false);
    }
  }, [selectedTemplate]);

  // Handle template selection
  useEffect(() => {
    console.log('📊 PatternSelector: Template changed', { selectedTemplate, isCustomMode });
    if (selectedTemplate && selectedTemplate !== 'custom' && !isCustomMode) {
      const template = currentTemplates[selectedTemplate];
      if (template) {
        console.log('✅ PatternSelector: Loading template pattern', template.pattern);
        onPatternArrayChange(template.pattern);
      }
    }
  }, [selectedTemplate, currentTemplates, isCustomMode, onPatternArrayChange]);

  // Handle custom pattern changes
  useEffect(() => {
    console.log('🎨 PatternSelector: Custom pattern changed', customPattern);
    if (isCustomMode) {
      onPatternArrayChange(customPattern);
    }
  }, [customPattern, isCustomMode, onPatternArrayChange]);

  const loadCustomPatterns = async () => {
    if (!user) return;
    
    console.log('📥 PatternSelector: Loading custom patterns for shift length:', shiftLength);
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('custom_patterns')
        .select('*')
        .eq('user_id', user.id)
        .eq('shift_type', shiftLength)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ PatternSelector: Error loading custom patterns:', error);
        toast({
          title: "Error loading patterns",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ PatternSelector: Loaded custom patterns:', data);
      setCustomPatterns((data || []) as CustomPattern[]);
    } catch (error) {
      console.error('❌ PatternSelector: Exception loading custom patterns:', error);
      toast({
        title: "Error loading patterns",
        description: "Failed to load custom patterns",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveCustomPattern = async () => {
    if (!user || !patternName.trim() || patternArray.length === 0) return;

    console.log('💾 PatternSelector: Saving custom pattern:', { patternName, patternArray, shiftLength });
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('custom_patterns')
        .insert({
          user_id: user.id,
          name: patternName.trim(),
          shift_type: shiftLength,
          pattern: patternArray
        });

      if (error) {
        console.error('❌ PatternSelector: Error saving pattern:', error);
        toast({
          title: "Error saving pattern",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ PatternSelector: Pattern saved successfully');
      toast({
        title: "Pattern saved",
        description: `"${patternName}" has been saved to your patterns`,
      });

      setPatternName('');
      await loadCustomPatterns();
    } catch (error) {
      console.error('❌ PatternSelector: Exception saving pattern:', error);
      toast({
        title: "Error saving pattern",
        description: "Failed to save pattern",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomPatternSelect = (patternId: string) => {
    console.log('📂 PatternSelector: Custom pattern selected:', patternId);
    
    if (!patternId) {
      setSelectedCustomPattern('');
      return;
    }

    const pattern = customPatterns.find(p => p.id === patternId);
    if (pattern) {
      console.log('✅ PatternSelector: Loading custom pattern:', pattern);
      setSelectedCustomPattern(patternId);
      setPatternName(pattern.name);
      
      // Force custom mode and template selection
      setIsCustomMode(true);
      onTemplateChange('custom');
      
      // Update the pattern arrays
      onCustomPatternChange(pattern.pattern);
      onPatternArrayChange(pattern.pattern);
      
      toast({
        title: "Pattern loaded",
        description: `"${pattern.name}" pattern is now loaded and ready for editing`,
      });
    }
  };

  const handleTemplateSelect = (template: string) => {
    console.log('📂 PatternSelector: Template selected', template);
    
    // Clear saved pattern selection when selecting a template
    setSelectedCustomPattern('');
    
    if (template === 'custom') {
      setIsCustomMode(true);
      onTemplateChange(template);
      onPatternArrayChange(customPattern);
    } else {
      setIsCustomMode(false);
      setPatternName('');
      onTemplateChange(template);
    }
  };

  const handleShiftCodeClick = (code: string) => {
    console.log('➕ PatternSelector: Adding shift code', code);
    const newPattern = [...customPattern, code];
    onCustomPatternChange(newPattern);
  };

  const handleBackspace = () => {
    console.log('⬅️ PatternSelector: Removing last shift code');
    const newPattern = customPattern.slice(0, -1);
    onCustomPatternChange(newPattern);
  };

  const handleClear = () => {
    console.log('🗑️ PatternSelector: Clearing custom pattern');
    onCustomPatternChange([]);
    setPatternName('');
    setSelectedCustomPattern('');
  };

  const getShiftCodeColor = (code: string) => {
    const shiftCode = SHIFT_CODES.find(s => s.code === code);
    return shiftCode?.color || 'bg-gray-100 text-gray-800';
  };

  const handleHandoverChange = (value: string) => {
    const numValue = Number(value);
    console.log('🤝 PatternSelector: Handover minutes changed:', numValue);
    if (onHandoverChange) {
      onHandoverChange(numValue);
    }
  };

  // Determine if custom builder should be visible
  const showCustomBuilder = isCustomMode || selectedTemplate === 'custom';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Pattern Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Shift Length Toggle */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Shift Length</Label>
          <RadioGroup
            value={shiftLength}
            onValueChange={(value: '8h' | '12h') => {
              console.log('⏰ PatternSelector: Shift length changed', value);
              onShiftLengthChange(value);
              // Reset selections when changing shift length
              onTemplateChange('');
              setIsCustomMode(false);
              setSelectedCustomPattern('');
              setPatternName('');
              onPatternArrayChange([]);
            }}
            className="flex gap-6"
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

        {/* Handover Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Handover Time</Label>
          <Select 
            value={handoverMinutes.toString()} 
            onValueChange={handleHandoverChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No handover (0 minutes)</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="45">45 minutes</SelectItem>
              <SelectItem value="60">60 minutes</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Time for shift handover between operators. This will extend shift end times.
          </p>
        </div>

        {/* My Patterns Section */}
        {isAuthenticated && customPatterns.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">My Saved Patterns</Label>
            <Select value={selectedCustomPattern} onValueChange={handleCustomPatternSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose from your saved patterns..." />
              </SelectTrigger>
              <SelectContent>
                {customPatterns.map((pattern) => (
                  <SelectItem key={pattern.id} value={pattern.id}>
                    {pattern.name} ({pattern.pattern.length} days)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Template Dropdown */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Standard Templates</Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a standard template..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(currentTemplates).map(([key, template]) => (
                <SelectItem key={key} value={key}>
                  {template.name}
                </SelectItem>
              ))}
              <SelectItem value="custom">Build Custom Pattern</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Pattern Builder */}
        {showCustomBuilder && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Custom Pattern Builder</Label>
            
            {/* Shift Code Buttons */}
            <div className="flex flex-wrap gap-2">
              {SHIFT_CODES.map((shift) => (
                <Button
                  key={shift.code}
                  variant="outline"
                  size="sm"
                  onClick={() => handleShiftCodeClick(shift.code)}
                  className="h-10"
                >
                  <span className="font-mono font-bold mr-2">{shift.code}</span>
                  {shift.label}
                </Button>
              ))}
            </div>

            {/* Control Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackspace}
                disabled={customPattern.length === 0}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Backspace
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={customPattern.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>

            {/* Save Pattern Section */}
            {isAuthenticated && patternArray.length > 0 && (
              <div className="space-y-3 p-4 border rounded-md bg-gray-50">
                <Label htmlFor="patternName" className="text-sm font-medium">Save This Pattern</Label>
                <Input
                  id="patternName"
                  type="text"
                  value={patternName}
                  onChange={(e) => setPatternName(e.target.value)}
                  placeholder="e.g. My Weekend Shift"
                  className="bg-white"
                />
                <Button 
                  onClick={saveCustomPattern} 
                  disabled={!patternName.trim() || patternArray.length === 0 || isSaving}
                  size="sm"
                >
                  {isSaving ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      Save Pattern
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Pattern Preview */}
        {patternArray.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Pattern Preview</Label>
            <div className="flex flex-wrap gap-1 p-3 border rounded-md bg-gray-50 min-h-[40px] items-center">
              {patternArray.map((code, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className={`font-mono ${getShiftCodeColor(code)}`}
                >
                  {code}
                </Badge>
              ))}
            </div>
            <div className="text-sm text-gray-600">
              Pattern Length: {patternArray.length} days
              {patternArray.length > 0 && (
                <span className="ml-4">
                  Cycle: {patternArray.join('-')}
                </span>
              )}
            </div>
          </div>
        )}

        {!isAuthenticated && (
          <div className="text-sm text-gray-500 italic">
            Sign in to save and load your custom patterns
          </div>
        )}
      </CardContent>
    </Card>
  );
}
