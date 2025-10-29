
import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Star, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from '@/hooks/use-toast';
import { PatternLibrary } from './PatternLibrary';
import { PatternEditor } from './PatternEditor';
import { PatternTestingInterface } from './PatternTestingInterface';
import { COMMON_PATTERNS } from './constants';

interface Pattern {
  id: string;
  name: string;
  pattern: string[];
  shift_type: '8h' | '12h';
  created_at: string;
}

interface ImprovedPatternsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPatternSelected?: (pattern: Pattern) => void;
}

type ViewMode = 'library' | 'edit' | 'create' | 'testing';

export function ImprovedPatternsPanel({ isOpen, onClose, onPatternSelected }: ImprovedPatternsPanelProps) {
  const [customPatterns, setCustomPatterns] = useState<Pattern[]>([]);
  const [selectedShiftType, setSelectedShiftType] = useState<'8h' | '12h'>('8h');
  const [viewMode, setViewMode] = useState<ViewMode>('library');
  const [editingPattern, setEditingPattern] = useState<Pattern | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { user, isAuthenticated } = useSupabaseAuth();

  useEffect(() => {
    if (isOpen && isAuthenticated && user) {
      loadCustomPatterns();
    }
  }, [isOpen, isAuthenticated, user, selectedShiftType]);

  const loadCustomPatterns = async () => {
    if (!user) return;
    
    console.log('📥 ImprovedPatternsPanel: Loading custom patterns for shift type:', selectedShiftType);
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('custom_patterns')
        .select('*')
        .eq('user_id', user.id)
        .eq('shift_type', selectedShiftType)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ ImprovedPatternsPanel: Error loading custom patterns:', error);
        toast({
          title: "Error loading patterns",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ ImprovedPatternsPanel: Loaded custom patterns:', data);
      setCustomPatterns((data || []) as Pattern[]);
    } catch (error) {
      console.error('❌ ImprovedPatternsPanel: Exception loading custom patterns:', error);
      toast({
        title: "Error loading patterns",
        description: "Failed to load custom patterns",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingPattern(null);
    setViewMode('create');
  };

  const handleEditPattern = (pattern: Pattern) => {
    setEditingPattern(pattern);
    setViewMode('edit');
  };

  const handleDuplicatePattern = (pattern: Pattern) => {
    setEditingPattern({
      ...pattern,
      id: '', // Remove ID to create new pattern
      name: `${pattern.name} (Copy)`,
    });
    setViewMode('create');
  };

  const handleDeletePattern = async (patternId: string) => {
    if (!user) return;
    
    console.log('🗑️ ImprovedPatternsPanel: Deleting pattern:', patternId);
    
    try {
      const { error } = await supabase
        .from('custom_patterns')
        .delete()
        .eq('id', patternId)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ ImprovedPatternsPanel: Error deleting pattern:', error);
        toast({
          title: "Error deleting pattern",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ ImprovedPatternsPanel: Pattern deleted successfully');
      toast({
        title: "Pattern deleted",
        description: "Pattern has been permanently deleted",
      });

      await loadCustomPatterns();
    } catch (error) {
      console.error('❌ ImprovedPatternsPanel: Exception deleting pattern:', error);
      toast({
        title: "Error deleting pattern",
        description: "Failed to delete pattern",
        variant: "destructive",
      });
    }
  };

  const handleSavePattern = async (patternData: { name: string; pattern: string[]; shift_type: '8h' | '12h' }) => {
    if (!user) return;

    console.log('💾 ImprovedPatternsPanel: Saving pattern:', patternData);
    setIsSaving(true);

    try {
      if (editingPattern?.id) {
        // Update existing pattern
        const { error } = await supabase
          .from('custom_patterns')
          .update({
            name: patternData.name,
            pattern: patternData.pattern,
            shift_type: patternData.shift_type
          })
          .eq('id', editingPattern.id)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "Pattern updated",
          description: `"${patternData.name}" has been updated`,
        });
      } else {
        // Create new pattern
        const { error } = await supabase
          .from('custom_patterns')
          .insert({
            user_id: user.id,
            name: patternData.name,
            pattern: patternData.pattern,
            shift_type: patternData.shift_type
          });

        if (error) throw error;

        toast({
          title: "Pattern created",
          description: `"${patternData.name}" has been saved`,
        });
      }

      setViewMode('library');
      setEditingPattern(null);
      await loadCustomPatterns();
    } catch (error: any) {
      console.error('❌ ImprovedPatternsPanel: Exception saving pattern:', error);
      toast({
        title: "Error saving pattern",
        description: error.message || "Failed to save pattern",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUsePattern = (pattern: Pattern) => {
    console.log('📋 ImprovedPatternsPanel: Using pattern:', pattern);
    
    if (onPatternSelected) {
      onPatternSelected(pattern);
    }
    
    toast({
      title: "Pattern selected",
      description: `"${pattern.name}" is now ready to use`,
    });
    
    onClose();
  };

  const handleCancel = () => {
    setViewMode('library');
    setEditingPattern(null);
  };

  const handleBackToLibrary = () => {
    setViewMode('library');
    setEditingPattern(null);
  };

  const commonPatterns = COMMON_PATTERNS[selectedShiftType].map(pattern => ({
    ...pattern,
    shift_type: selectedShiftType,
    created_at: new Date().toISOString()
  }));

  const getViewTitle = () => {
    switch (viewMode) {
      case 'library': return 'Shift Patterns';
      case 'create': return 'Create Pattern';
      case 'edit': return 'Edit Pattern';
      case 'testing': return 'Pattern Testing';
      default: return 'Shift Patterns';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[95vw] sm:w-[80vw] max-w-6xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {viewMode !== 'library' && (
                <Button variant="ghost" size="sm" onClick={handleBackToLibrary}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <SheetTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                {getViewTitle()}
              </SheetTitle>
            </div>
            {viewMode === 'library' && (
              <div className="flex gap-2">
                <Button
                  variant={selectedShiftType === '8h' ? 'default' : 'outline'}
                  onClick={() => setSelectedShiftType('8h')}
                  size="sm"
                >
                  8-Hour
                </Button>
                <Button
                  variant={selectedShiftType === '12h' ? 'default' : 'outline'}
                  onClick={() => setSelectedShiftType('12h')}
                  size="sm"
                >
                  12-Hour
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6">
          {viewMode === 'library' ? (
            <Tabs defaultValue="patterns" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="patterns">Shift Patterns</TabsTrigger>
                <TabsTrigger value="testing" className="flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  Testing Suite
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="patterns" className="mt-6">
                <PatternLibrary
                  customPatterns={customPatterns}
                  commonPatterns={commonPatterns}
                  selectedShiftType={selectedShiftType}
                  onCreateNew={handleCreateNew}
                  onEditPattern={handleEditPattern}
                  onDuplicatePattern={handleDuplicatePattern}
                  onDeletePattern={handleDeletePattern}
                  onUsePattern={handleUsePattern}
                  isLoading={isLoading}
                />
              </TabsContent>
              
              <TabsContent value="testing" className="mt-6">
                <PatternTestingInterface />
              </TabsContent>
            </Tabs>
          ) : (
            <PatternEditor
              pattern={editingPattern || undefined}
              isNew={viewMode === 'create'}
              onSave={handleSavePattern}
              onCancel={handleCancel}
              onDelete={editingPattern?.id ? () => handleDeletePattern(editingPattern.id) : undefined}
              isSaving={isSaving}
            />
          )}
        </div>

        {!isAuthenticated && viewMode === 'library' && (
          <div className="fixed bottom-4 left-4 right-4 bg-background border rounded-lg p-4 shadow-lg">
            <p className="text-sm text-muted-foreground mb-2">
              Sign in to save and manage your custom patterns
            </p>
            <Button size="sm" variant="outline">
              Sign In
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
