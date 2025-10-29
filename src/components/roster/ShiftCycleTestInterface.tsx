
import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, TestTube, RefreshCw } from 'lucide-react';
import { generateShiftCycle, validateShiftCycle } from '@/services/roster/helpers/shiftCycleGenerator';

export const ShiftCycleTestInterface = () => {
  const [cycleLength, setCycleLength] = useState(14);
  const [shiftMode, setShiftMode] = useState<'8h' | '12h'>('12h');
  const [generatedCycle, setGeneratedCycle] = useState<string>('');
  const [validationResults, setValidationResults] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateCycle = async () => {
    setIsGenerating(true);
    try {
      const cycle = generateShiftCycle(cycleLength, shiftMode);
      setGeneratedCycle(cycle);
      
      // Validate the generated cycle
      const validation = validateShiftCycle(cycle, shiftMode);
      setValidationResults(validation);
    } catch (error) {
      console.error('Error generating cycle:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getShiftColor = (shift: string) => {
    switch (shift) {
      case 'D': return 'bg-blue-100 text-blue-800';
      case 'N': return 'bg-indigo-100 text-indigo-800';
      case 'E': return 'bg-purple-100 text-purple-800';
      case 'L': return 'bg-green-100 text-green-800';
      case 'R': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderCycleVisual = () => {
    if (!generatedCycle) return null;

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {generatedCycle.split('').map((shift, index) => (
            <Badge key={index} className={`${getShiftColor(shift)} font-mono`}>
              {shift}
            </Badge>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          Cycle Length: {generatedCycle.length} days
        </div>
      </div>
    );
  };

  const renderValidationResults = () => {
    if (!validationResults) return null;

    return (
      <div className="space-y-2">
        <h4 className="font-medium">Validation Results</h4>
        {Object.entries(validationResults.rules).map(([rule, passed]) => (
          <div key={rule} className="flex items-center gap-2">
            {passed ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className={`text-sm ${passed ? 'text-green-800' : 'text-red-800'}`}>
              {rule}
            </span>
          </div>
        ))}
        
        {validationResults.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="space-y-1">
                {validationResults.errors.map((error: string, index: number) => (
                  <div key={index}>• {error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="text-sm">
          <strong>Overall Valid:</strong> {validationResults.isValid ? '✅ Yes' : '❌ No'}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Shift Cycle Generator Test Interface
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cycleLength">Cycle Length (days)</Label>
            <Input
              id="cycleLength"
              type="number"
              min="7"
              max="28"
              value={cycleLength}
              onChange={(e) => setCycleLength(parseInt(e.target.value) || 14)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Shift Mode</Label>
            <Select value={shiftMode} onValueChange={(value: '8h' | '12h') => setShiftMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12-hour (D/N)</SelectItem>
                <SelectItem value="8h">8-hour (E/L/N)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end">
            <Button 
              onClick={handleGenerateCycle}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Generate Cycle
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Generated Cycle Display */}
        {generatedCycle && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Generated Shift Cycle</h4>
              {renderCycleVisual()}
            </div>
            
            {/* Validation Results */}
            {validationResults && renderValidationResults()}
          </div>
        )}

        {/* Preset Examples */}
        <div className="space-y-2">
          <h4 className="font-medium">Quick Tests</h4>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setCycleLength(7);
                setShiftMode('8h');
                setTimeout(handleGenerateCycle, 100);
              }}
            >
              7-day (8h)
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setCycleLength(14);
                setShiftMode('12h');
                setTimeout(handleGenerateCycle, 100);
              }}
            >
              14-day (12h)
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setCycleLength(21);
                setShiftMode('8h');
                setTimeout(handleGenerateCycle, 100);
              }}
            >
              21-day (8h)
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
