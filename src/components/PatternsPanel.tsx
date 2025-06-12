
import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from '@/hooks/use-toast';
import { PatternCard } from './patterns/PatternCard';
import { NewPatternForm } from './patterns/NewPatternForm';
import { COMMON_PATTERNS } from './patterns/constants';
import { usePatternActions } from './patterns/hooks/usePatternActions';

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

export function PatternsPanel({ isOpen, onClose, onPatternSelected }: PatternsPanelProps) {
  const [customPatterns, setCustomPatterns] = useState<Pattern[]>([]);
  const [selectedShiftType, setSelectedShiftType] = useState<'8h' | '12h'>('8h');
  const [isLoading, setIsLoading] = useState(false);
  
  const { user, isAuthenticated } = useSupabaseAuth();
  const {
    editingPattern,
    editName,
    setEditName,
    isSaving,
    isCreatingNew,
    newPatternName,
    setNewPatternName,
    newPatternCodes,
    handleCreateNewPattern,
    handleSaveNewPattern,
    handleCancelNewPattern,
    updatePatternCode,
    addPatternDay,
    removePatternDay,
    handleEditPattern,
    handleSaveEdit,
    handleCancelEdit
  } = usePatternActions();

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
                  <Button size="sm" variant="outline" onClick={handleCreateNewPattern}>
                    <Plus className="h-4 w-4 mr-1" />
                    New
                  </Button>
                </div>

                {/* New Pattern Creation Form */}
                <NewPatternForm
                  isVisible={isCreatingNew}
                  patternName={newPatternName}
                  patternCodes={newPatternCodes}
                  isSaving={isSaving}
                  onPatternNameChange={setNewPatternName}
                  onPatternCodeChange={updatePatternCode}
                  onAddDay={addPatternDay}
                  onRemoveDay={removePatternDay}
                  onSave={() => handleSaveNewPattern(user, selectedShiftType, loadCustomPatterns)}
                  onCancel={handleCancelNewPattern}
                />
                
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading your patterns...</p>
                  </div>
                ) : customPatterns.length > 0 ? (
                  <div className="space-y-3">
                    {customPatterns.map((pattern) => (
                      <PatternCard
                        key={pattern.id}
                        pattern={pattern}
                        isCustom={true}
                        isEditing={editingPattern?.id === pattern.id}
                        editName={editName}
                        isSaving={isSaving}
                        onEdit={handleEditPattern}
                        onUse={handleUsePattern}
                        onSaveEdit={() => handleSaveEdit(loadCustomPatterns)}
                        onCancelEdit={handleCancelEdit}
                        onEditNameChange={setEditName}
                      />
                    ))}
                  </div>
                ) : !isCreatingNew ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Star className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No custom patterns yet</p>
                      <Button size="sm" variant="outline" className="mt-2" onClick={handleCreateNewPattern}>
                        <Plus className="h-4 w-4 mr-1" />
                        Create Your First Pattern
                      </Button>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
              
              <Separator />
            </>
          )}

          {/* Common Patterns Section */}
          <div>
            <h3 className="font-semibold mb-4">Common Patterns</h3>
            <div className="space-y-3">
              {COMMON_PATTERNS[selectedShiftType].map((pattern) => (
                <PatternCard
                  key={pattern.id}
                  pattern={pattern}
                  onUse={handleUsePattern}
                />
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
