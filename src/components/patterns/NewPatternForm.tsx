
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Save, X } from 'lucide-react';

interface NewPatternFormProps {
  isVisible: boolean;
  patternName: string;
  patternCodes: string[];
  isSaving: boolean;
  onPatternNameChange: (name: string) => void;
  onPatternCodeChange: (index: number, code: string) => void;
  onAddDay: () => void;
  onRemoveDay: (index: number) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function NewPatternForm({
  isVisible,
  patternName,
  patternCodes,
  isSaving,
  onPatternNameChange,
  onPatternCodeChange,
  onAddDay,
  onRemoveDay,
  onSave,
  onCancel
}: NewPatternFormProps) {
  if (!isVisible) return null;

  return (
    <Card className="mb-4 border-dashed">
      <CardContent className="p-4 space-y-4">
        <div>
          <Label htmlFor="new-pattern-name">Pattern Name</Label>
          <Input
            id="new-pattern-name"
            value={patternName}
            onChange={(e) => onPatternNameChange(e.target.value)}
            placeholder="Enter pattern name"
          />
        </div>
        
        <div>
          <Label>Pattern ({patternCodes.length} days)</Label>
          <div className="flex flex-wrap gap-1 mt-2">
            {patternCodes.map((code, index) => (
              <div key={index} className="flex items-center gap-1">
                <select
                  value={code}
                  onChange={(e) => onPatternCodeChange(index, e.target.value)}
                  className="text-xs border rounded px-1 py-1"
                >
                  <option value="D">D (Day)</option>
                  <option value="E">E (Early)</option>
                  <option value="L">L (Late)</option>
                  <option value="N">N (Night)</option>
                  <option value="R">R (Rest)</option>
                </select>
                {patternCodes.length > 1 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRemoveDay(index)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={onAddDay}
              className="h-6 w-6 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onSave}
            disabled={!patternName.trim() || isSaving}
            className="flex-1"
          >
            <Save className="h-3 w-3 mr-1" />
            {isSaving ? 'Saving...' : 'Save Pattern'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
