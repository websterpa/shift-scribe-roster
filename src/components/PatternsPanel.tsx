
import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit, Play, Star, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from '@/hooks/use-toast';

interface Pattern {
  id: string;
  name: string;
  pattern: string[];
  shift_type: '8h' | '12h';
  created_at: string;
}

interface PatternsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPatternSelected: (pattern: Pattern) => void;
}

const COMMON_PATTERNS = {
  '8h': [
    { id: 'continental', name: 'Continental (7-day)', pattern: ['D', 'D', 'R', 'R', 'R', 'N', 'N'], description: 'Classic 7-day rotating pattern' },
    { id: '4-on-4-off', name: '4-On/4-Off', pattern: ['D', 'D', 'D', 'D', 'R', 'R', 'R', 'R'], description: '4 days on, 4 days off' },
    { id: '5-2-standard', name: '5-2 Standard', pattern: ['D', 'D', 'D', 'D', 'D', 'R', 'R'], description: 'Monday to Friday work pattern' },
    { id: 'pitman', name: 'Pitman', pattern: ['D', 'D', 'R', 'N', 'N', 'R', 'R'], description: '2-2-3 rotation pattern' }
  ],
  '12h': [
    { id: 'dupont', name: 'DuPont (14-day)', pattern: ['D', 'D', 'D', 'D', 'R', 'R', 'R', 'N', 'N', 'N', 'N', 'R', 'R', 'R'], description: 'Classic 12-hour DuPont pattern' },
    { id: 'day-night-2-crew', name: 'Day/Night 2-Crew', pattern: ['D', 'D', 'D', 'D', 'R', 'R', 'R', 'R', 'N', 'N', 'N', 'N', 'R', 'R', 'R', 'R'], description: '16-day rotation for 2 crews' },
    { id: '3-4-3-weekend', name: '3-4-3 Weekend-Balanced', pattern: ['D', 'D', 'D', 'R', 'R', 'R', 'R', 'N', 'N', 'N'], description: 'Weekend-friendly 10-day pattern' }
  ]
};

export function PatternsPanel({ isOpen, onClose, onPatternSelected }: PatternsPanelProps) {
  const [customPatterns, setCustomPatterns] = useState<Pattern[]>([]);
  const [selectedShiftType, setSelectedShiftType] = useState<'8h' | '12h'>('8h');
  const [isLoading, setIsLoading] = useState(false);
  const [editingPattern, setEditingPattern] = useState<Pattern | null>(null);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const { user, isAuthenticated } = useSupabaseAuth();

  useEffect(() => {
    if (isOpen && isAuthenticated && user) {
      loadCustomPatterns();
    }
  }, [isOpen, isAuthenticated, user, selectedShiftType]);

  const loadCustomPatterns = async () => {
    if (!user) return;
    
    console.log('📥 PatternsPanel: Loading custom patterns for shift type:', selectedShiftType);
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('custom_patterns')
        .select('*')
        .eq('user_id', user.id)
        .eq('shift_type', selectedShiftType)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ PatternsPanel: Error loading custom patterns:', error);
        toast({
          title: "Error loading patterns",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ PatternsPanel: Loaded custom patterns:', data);
      setCustomPatterns((data || []) as Pattern[]);
    } catch (error) {
      console.error('❌ PatternsPanel: Exception loading custom patterns:', error);
      toast({
        title: "Error loading patterns",
        description: "Failed to load custom patterns",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsePattern = (pattern: any, isCustom: boolean = false) => {
    console.log('📋 PatternsPanel: Using pattern:', pattern);
    
    const formattedPattern: Pattern = isCustom ? pattern : {
      id: pattern.id,
      name: pattern.name,
      pattern: pattern.pattern,
      shift_type: selectedShiftType,
      created_at: new Date().toISOString()
    };
    
    onPatternSelected(formattedPattern);
    toast({
      title: "Pattern selected",
      description: `"${formattedPattern.name}" is now ready to use`,
    });
  };

  const handleEditPattern = (pattern: Pattern) => {
    console.log('✏️ PatternsPanel: Editing pattern:', pattern);
    setEditingPattern(pattern);
    setEditName(pattern.name);
  };

  const handleSaveEdit = async () => {
    if (!editingPattern || !editName.trim()) return;
    
    console.log('💾 PatternsPanel: Saving pattern edit:', editingPattern.id);
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('custom_patterns')
        .update({ name: editName.trim() })
        .eq('id', editingPattern.id);

      if (error) {
        console.error('❌ PatternsPanel: Error updating pattern:', error);
        toast({
          title: "Error updating pattern",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ PatternsPanel: Pattern updated successfully');
      toast({
        title: "Pattern updated",
        description: `"${editName.trim()}" has been updated`,
      });

      setEditingPattern(null);
      setEditName('');
      await loadCustomPatterns(); // Reload patterns
    } catch (error) {
      console.error('❌ PatternsPanel: Exception updating pattern:', error);
      toast({
        title: "Error updating pattern",
        description: "Failed to update pattern",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingPattern(null);
    setEditName('');
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

  const PatternCard = ({ pattern, isCustom = false, showActions = true }: { pattern: any; isCustom?: boolean; showActions?: boolean }) => {
    const isEditing = editingPattern?.id === pattern.id;
    
    return (
      <Card className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Pattern Name</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter pattern name"
                  />
                </div>
              ) : (
                <>
                  <CardTitle className="text-base">{pattern.name}</CardTitle>
                  {pattern.description && (
                    <p className="text-sm text-muted-foreground mt-1">{pattern.description}</p>
                  )}
                </>
              )}
            </div>
            {isCustom && !isEditing && <Star className="h-4 w-4 text-yellow-500" />}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {pattern.pattern.slice(0, 14).map((code: string, index: number) => (
              <Badge key={index} variant="outline" className={`text-xs ${getShiftCodeColor(code)}`}>
                {code}
              </Badge>
            ))}
            {pattern.pattern.length > 14 && (
              <span className="text-xs text-muted-foreground">+{pattern.pattern.length - 14} more</span>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            {pattern.pattern.length}-day cycle
          </div>
          
          {showActions && (
            <div className="flex gap-2 pt-2">
              {isEditing ? (
                <>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={!editName.trim() || isSaving}
                    className="flex-1"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleUsePattern(pattern, isCustom)}
                    className="flex-1"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Use
                  </Button>
                  {isCustom && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditPattern(pattern)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Shift Patterns
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Shift Type Selector */}
          <div className="flex gap-2">
            <Button
              variant={selectedShiftType === '8h' ? 'default' : 'outline'}
              onClick={() => setSelectedShiftType('8h')}
              className="flex-1"
            >
              8-Hour Shifts
            </Button>
            <Button
              variant={selectedShiftType === '12h' ? 'default' : 'outline'}
              onClick={() => setSelectedShiftType('12h')}
              className="flex-1"
            >
              12-Hour Shifts
            </Button>
          </div>

          {/* My Patterns Section */}
          {isAuthenticated && (
            <>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">My Patterns</h3>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    New
                  </Button>
                </div>
                
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading your patterns...</p>
                  </div>
                ) : customPatterns.length > 0 ? (
                  <div className="space-y-3">
                    {customPatterns.map((pattern) => (
                      <PatternCard key={pattern.id} pattern={pattern} isCustom={true} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Star className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No custom patterns yet</p>
                      <Button size="sm" variant="outline" className="mt-2">
                        <Plus className="h-4 w-4 mr-1" />
                        Create Your First Pattern
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              <Separator />
            </>
          )}

          {/* Common Patterns Section */}
          <div>
            <h3 className="font-semibold mb-4">Common Patterns</h3>
            <div className="space-y-3">
              {COMMON_PATTERNS[selectedShiftType].map((pattern) => (
                <PatternCard key={pattern.id} pattern={pattern} />
              ))}
            </div>
          </div>

          {!isAuthenticated && (
            <Card className="border-dashed">
              <CardContent className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-2">
                  Sign in to save and manage your custom patterns
                </p>
                <Button size="sm" variant="outline">
                  Sign In
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
