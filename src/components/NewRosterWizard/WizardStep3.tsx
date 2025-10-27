
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { WizardStepProps, CustomPattern } from './types';
import { COMMON_TEMPLATES } from './constants';
import { remapToFramework } from '@/features/roster/shiftMap';
import { EligibilityInspector } from '@/features/roster/debug/EligibilityInspector';

interface WizardStep3Props extends WizardStepProps {
  customPatterns: CustomPattern[];
  isLoadingPatterns: boolean;
  isAuthenticated: boolean;
}

export function WizardStep3({ 
  config, 
  setConfig, 
  customPatterns, 
  isLoadingPatterns, 
  isAuthenticated 
}: WizardStep3Props) {
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

  // Apply framework remapping to display codes (E/L → D in 12h mode)
  const getDisplayCodes = (codes: readonly string[] | string[]) => {
    const mutableCodes = [...codes]; // Convert readonly to mutable
    if (config.shiftType === '12h') {
      return remapToFramework(mutableCodes, '12h');
    }
    return mutableCodes;
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
                              {getDisplayCodes(pattern.pattern.slice(0, 7)).map((code, index) => (
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
                          {getDisplayCodes(template.pattern.slice(0, 7)).map((code, index) => (
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
                  {getDisplayCodes(selectedPattern.pattern).map((code, index) => (
                    <Badge key={index} variant="secondary" className={getShiftCodeColor(code)}>
                      Day {index + 1}: {code}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Staff Eligibility Inspector */}
          <div className="mt-6">
            <EligibilityInspector 
              monthISO={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
              shiftSystem={config.shiftType}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
