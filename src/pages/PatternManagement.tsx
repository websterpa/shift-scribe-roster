
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Star, TestTube } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from '@/hooks/use-toast';
import { PatternLibrary } from '@/components/patterns/PatternLibrary';
import { PatternEditor } from '@/components/patterns/PatternEditor';
import { PatternTestingInterface } from '@/components/patterns/PatternTestingInterface';
import { PatternStaffAssignment } from '@/components/patterns/PatternStaffAssignment';
import { COMMON_PATTERNS } from '@/components/patterns/constants';

interface Pattern {
  id: string;
  name: string;
  pattern: string[];
  shift_type: '8h' | '12h';
  created_at: string;
  repeat_weeks?: number;
  avg_weekly_hours?: number;
  crews_required?: number;
  is_wtd_compliant?: boolean;
  description?: string;
}

type ViewMode = 'library' | 'edit' | 'create' | 'testing';

export default function PatternManagement() {
  const [customPatterns, setCustomPatterns] = useState<Pattern[]>([]);
  const [selectedShiftType, setSelectedShiftType] = useState<'8h' | '12h'>('8h');
  const [viewMode, setViewMode] = useState<ViewMode>('library');
  const [editingPattern, setEditingPattern] = useState<Pattern | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [patternForAssignment, setPatternForAssignment] = useState<Pattern | null>(null);
  
  const { user, isAuthenticated } = useSupabaseAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      loadCustomPatterns();
    }
  }, [isAuthenticated, user, selectedShiftType]);

  const loadCustomPatterns = async () => {
    if (!user) return;
    
    console.log('📥 PatternManagement: Loading custom patterns for shift type:', selectedShiftType);
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('custom_patterns')
        .select('*')
        .eq('user_id', user.id)
        .eq('shift_type', selectedShiftType)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ PatternManagement: Error loading custom patterns:', error);
        toast({
          title: "Error loading patterns",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ PatternManagement: Loaded custom patterns:', data);
      setCustomPatterns((data || []) as Pattern[]);
    } catch (error) {
      console.error('❌ PatternManagement: Exception loading custom patterns:', error);
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
    
    console.log('🗑️ PatternManagement: Deleting pattern:', patternId);
    
    try {
      const { error } = await supabase
        .from('custom_patterns')
        .delete()
        .eq('id', patternId)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ PatternManagement: Error deleting pattern:', error);
        toast({
          title: "Error deleting pattern",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ PatternManagement: Pattern deleted successfully');
      toast({
        title: "Pattern deleted",
        description: "Pattern has been permanently deleted",
      });

      await loadCustomPatterns();
    } catch (error) {
      console.error('❌ PatternManagement: Exception deleting pattern:', error);
      toast({
        title: "Error deleting pattern",
        description: "Failed to delete pattern",
        variant: "destructive",
      });
    }
  };

  const handleSavePattern = async (patternData: { 
    name: string; 
    pattern: string[]; 
    shift_type: '8h' | '12h';
    repeat_weeks?: number;
    avg_weekly_hours?: number;
    crews_required?: number;
    is_wtd_compliant?: boolean;
    description?: string;
  }) => {
    if (!user) return;

    console.log('💾 PatternManagement: Saving pattern:', patternData);
    setIsSaving(true);

    try {
      if (editingPattern?.id) {
        // Update existing pattern
        const { error } = await supabase
          .from('custom_patterns')
          .update({
            name: patternData.name,
            pattern: patternData.pattern,
            shift_type: patternData.shift_type,
            avg_weekly_hours: patternData.avg_weekly_hours,
            crews_required: patternData.crews_required,
            is_wtd_compliant: patternData.is_wtd_compliant,
            description: patternData.description
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
            shift_type: patternData.shift_type,
            avg_weekly_hours: patternData.avg_weekly_hours,
            crews_required: patternData.crews_required,
            is_wtd_compliant: patternData.is_wtd_compliant,
            description: patternData.description
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
      console.error('❌ PatternManagement: Exception saving pattern:', error);
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
    console.log('📋 PatternManagement: Using pattern:', pattern);
    
    toast({
      title: "Pattern selected",
      description: `"${pattern.name}" is now ready to use`,
    });
    
    // Navigate back to dashboard or roster generation
    navigate('/generate-roster');
  };

  const handleCancel = () => {
    setViewMode('library');
    setEditingPattern(null);
  };

  const handleBackToLibrary = () => {
    setViewMode('library');
    setEditingPattern(null);
  };

  const handleAssignToStaff = (pattern: Pattern) => {
    console.log('👥 Opening staff assignment for pattern:', pattern.name);
    setPatternForAssignment(pattern);
    setAssignmentDialogOpen(true);
  };

  const handleAssignmentComplete = () => {
    console.log('✅ Pattern assignment completed, reloading patterns');
    loadCustomPatterns();
  };

  const commonPatterns = COMMON_PATTERNS[selectedShiftType];

  const getViewTitle = () => {
    switch (viewMode) {
      case 'library': return 'Pattern Management';
      case 'create': return 'Create Pattern';
      case 'edit': return 'Edit Pattern';
      case 'testing': return 'Pattern Testing';
      default: return 'Pattern Management';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Star className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">{getViewTitle()}</h1>
              </div>
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
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {viewMode === 'library' ? (
          <Tabs defaultValue="patterns" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="patterns">Pattern Library</TabsTrigger>
              <TabsTrigger value="testing" className="flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Testing Suite
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="patterns">
              <PatternLibrary
                customPatterns={customPatterns}
                commonPatterns={commonPatterns}
                selectedShiftType={selectedShiftType}
                onCreateNew={handleCreateNew}
                onEditPattern={handleEditPattern}
                onDuplicatePattern={handleDuplicatePattern}
                onDeletePattern={handleDeletePattern}
                onUsePattern={handleUsePattern}
                onAssignToStaff={handleAssignToStaff}
                isLoading={isLoading}
              />
            </TabsContent>
            
            <TabsContent value="testing">
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

        {!isAuthenticated && viewMode === 'library' && (
          <div className="fixed bottom-4 left-4 right-4 bg-background border rounded-lg p-4 shadow-lg max-w-md mx-auto">
            <p className="text-sm text-muted-foreground mb-2">
              Sign in to save and manage your custom patterns
            </p>
            <Button size="sm" variant="outline" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        )}
      </div>

      {/* Staff Assignment Dialog */}
      <PatternStaffAssignment
        pattern={patternForAssignment}
        open={assignmentDialogOpen}
        onOpenChange={setAssignmentDialogOpen}
        onAssignmentComplete={handleAssignmentComplete}
      />
    </div>
  );
}
