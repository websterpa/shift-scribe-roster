
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Save, Copy, Trash, Plus, Edit } from 'lucide-react';

interface PatternEditorProps {
  pattern?: {
    id?: string;
    name: string;
    pattern: string[];
    shift_type: '8h' | '12h';
  };
  isNew?: boolean;
  onSave: (pattern: { name: string; pattern: string[]; shift_type: '8h' | '12h' }) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isSaving?: boolean;
}

const SHIFT_CODES = {
  '8h': [
    { code: 'E', label: 'Early', color: 'bg-blue-100 text-blue-800', time: '07:45-15:45' },
    { code: 'D', label: 'Day', color: 'bg-yellow-100 text-yellow-800', time: '09:00-17:00' },
    { code: 'L', label: 'Late', color: 'bg-orange-100 text-orange-800', time: '15:45-23:45' },
    { code: 'N', label: 'Night', color: 'bg-purple-100 text-purple-800', time: '23:45-07:45' },
    { code: 'R', label: 'Rest', color: 'bg-gray-100 text-gray-800', time: 'Day off' }
  ],
  '12h': [
    { code: 'D', label: 'Day', color: 'bg-yellow-100 text-yellow-800', time: '07:00-19:00' },
    { code: 'N', label: 'Night', color: 'bg-purple-100 text-purple-800', time: '19:00-07:00' },
    { code: 'R', label: 'Rest', color: 'bg-gray-100 text-gray-800', time: 'Day off' }
  ]
};

export function PatternEditor({ 
  pattern, 
  isNew = false, 
  onSave, 
  onCancel, 
  onDelete, 
  isSaving = false 
}: PatternEditorProps) {
  const [name, setName] = useState(pattern?.name || '');
  const [shiftType, setShiftType] = useState<'8h' | '12h'>(pattern?.shift_type || '8h');
  const [patternCodes, setPatternCodes] = useState<string[]>(pattern?.pattern || ['R']);

  const availableShifts = SHIFT_CODES[shiftType];

  const getShiftInfo = (code: string) => {
    return availableShifts.find(shift => shift.code === code) || availableShifts[availableShifts.length - 1];
  };

  const updateShiftCode = (index: number, newCode: string) => {
    const newPattern = [...patternCodes];
    newPattern[index] = newCode;
    setPatternCodes(newPattern);
  };

  const addDay = () => {
    setPatternCodes([...patternCodes, 'R']);
  };

  const removeDay = (index: number) => {
    if (patternCodes.length > 1) {
      const newPattern = patternCodes.filter((_, i) => i !== index);
      setPatternCodes(newPattern);
    }
  };

  const duplicatePattern = () => {
    setPatternCodes([...patternCodes, ...patternCodes]);
  };

  const clearPattern = () => {
    setPatternCodes(['R']);
  };

  const handleSave = () => {
    if (name.trim() && patternCodes.length > 0) {
      onSave({
        name: name.trim(),
        pattern: patternCodes,
        shift_type: shiftType
      });
    }
  };

  const canSave = name.trim() && patternCodes.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {isNew ? 'Create New Pattern' : `Edit Pattern: ${pattern?.name}`}
          </h2>
          <p className="text-muted-foreground">
            Design your shift pattern by selecting shift codes for each day in the cycle
          </p>
        </div>
      </div>

      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Pattern Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pattern-name">Pattern Name</Label>
              <Input
                id="pattern-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Weekend Pattern"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Shift Type</Label>
              <Select value={shiftType} onValueChange={(value: '8h' | '12h') => setShiftType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8h">8-Hour Shifts</SelectItem>
                  <SelectItem value="12h">12-Hour Shifts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pattern Builder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pattern Builder ({patternCodes.length} days)</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addDay}>
                <Plus className="h-4 w-4 mr-1" />
                Add Day
              </Button>
              <Button variant="outline" size="sm" onClick={duplicatePattern}>
                <Copy className="h-4 w-4 mr-1" />
                Duplicate
              </Button>
              <Button variant="outline" size="sm" onClick={clearPattern}>
                <Trash className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Shift Code Legend */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Available Shift Codes</Label>
            <div className="flex flex-wrap gap-2">
              {availableShifts.map((shift) => (
                <div key={shift.code} className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
                  <Badge className={`${shift.color} font-mono font-bold`}>
                    {shift.code}
                  </Badge>
                  <div className="text-xs">
                    <div className="font-medium">{shift.label}</div>
                    <div className="text-muted-foreground">{shift.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Pattern Grid */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Pattern Sequence</Label>
            <div className="grid grid-cols-7 gap-2">
              {patternCodes.map((code, index) => {
                const shiftInfo = getShiftInfo(code);
                return (
                  <div key={index} className="space-y-2">
                    <div className="text-xs text-center font-medium text-muted-foreground">
                      Day {index + 1}
                    </div>
                    <div className="space-y-1">
                      <Select 
                        value={code} 
                        onValueChange={(value) => updateShiftCode(index, value)}
                      >
                        <SelectTrigger className="h-12 w-full">
                          <SelectValue>
                            <div className="flex flex-col items-center">
                              <Badge className={`${shiftInfo.color} font-mono text-xs`}>
                                {code}
                              </Badge>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {availableShifts.map((shift) => (
                            <SelectItem key={shift.code} value={shift.code}>
                              <div className="flex items-center gap-2">
                                <Badge className={`${shift.color} font-mono text-xs`}>
                                  {shift.code}
                                </Badge>
                                <div className="text-xs">
                                  <div>{shift.label}</div>
                                  <div className="text-muted-foreground">{shift.time}</div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {patternCodes.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDay(index)}
                          className="h-6 w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pattern Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Pattern Preview</Label>
            <div className="flex flex-wrap gap-1 p-3 border rounded-md bg-gray-50 min-h-[60px] items-center">
              {patternCodes.map((code, index) => {
                const shiftInfo = getShiftInfo(code);
                return (
                  <div key={index} className="flex flex-col items-center gap-1">
                    <Badge className={`${shiftInfo.color} font-mono text-xs`}>
                      {code}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="text-sm text-muted-foreground">
              Pattern: {patternCodes.join('-')} • {patternCodes.length} day cycle
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {!isNew && onDelete && (
            <Button variant="destructive" onClick={onDelete}>
              <Trash className="h-4 w-4 mr-1" />
              Delete Pattern
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!canSave || isSaving}
          >
            {isSaving ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                {isNew ? 'Create Pattern' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
