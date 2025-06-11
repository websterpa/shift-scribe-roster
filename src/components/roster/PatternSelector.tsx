
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Trash2, RotateCcw } from 'lucide-react';

interface PatternSelectorProps {
  shiftLength: '8h' | '12h';
  onShiftLengthChange: (length: '8h' | '12h') => void;
  selectedTemplate: string;
  onTemplateChange: (template: string) => void;
  customPattern: string[];
  onCustomPatternChange: (pattern: string[]) => void;
  patternArray: string[];
  onPatternArrayChange: (pattern: string[]) => void;
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
  onPatternArrayChange
}: PatternSelectorProps) {
  console.log('🔄 PatternSelector rendered', { shiftLength, selectedTemplate, customPattern, patternArray });

  const [isCustomMode, setIsCustomMode] = useState(false);

  const currentTemplates = SHIFT_TEMPLATES[shiftLength];

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

  useEffect(() => {
    console.log('🎨 PatternSelector: Custom pattern changed', customPattern);
    if (isCustomMode) {
      onPatternArrayChange(customPattern);
    }
  }, [customPattern, isCustomMode, onPatternArrayChange]);

  const handleTemplateSelect = (template: string) => {
    console.log('📂 PatternSelector: Template selected', template);
    if (template === 'custom') {
      setIsCustomMode(true);
      onTemplateChange(template);
      onPatternArrayChange(customPattern);
    } else {
      setIsCustomMode(false);
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
  };

  const getShiftCodeColor = (code: string) => {
    const shiftCode = SHIFT_CODES.find(s => s.code === code);
    return shiftCode?.color || 'bg-gray-100 text-gray-800';
  };

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

        {/* Template Dropdown */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Shift Pattern Template</Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a pattern template..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(currentTemplates).map(([key, template]) => (
                <SelectItem key={key} value={key}>
                  {template.name}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom Pattern</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Pattern Builder */}
        {isCustomMode && (
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
      </CardContent>
    </Card>
  );
}
