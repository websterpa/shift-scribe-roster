import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { PatternEditor } from '@/components/patterns/PatternEditor';
import { listPatterns, savePattern, deletePattern, type SavedPattern } from '@/services/patterns';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getTenantId } from '@/features/tenant/useTenant';
import { createLogger } from '@/utils/errorLogger';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const logger = createLogger('ShiftPatterns');

export default function ShiftPatterns() {
  const [patterns, setPatterns] = useState<SavedPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPattern, setEditingPattern] = useState<SavedPattern | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [deleteConfirmPattern, setDeleteConfirmPattern] = useState<SavedPattern | null>(null);

  const tenantId = getTenantId();

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    logger.info('Loading site patterns');
    setLoading(true);
    try {
      const data = await listPatterns(tenantId);
      setPatterns(data);
      logger.info('Loaded patterns', { count: data.length });
    } catch (error) {
      logger.error('Failed to load patterns', { error });
      toast({
        title: 'Error loading patterns',
        description: 'Failed to fetch shift patterns',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    logger.info('Creating new pattern');
    setIsCreatingNew(true);
    setEditingPattern(null);
  };

  const handleEdit = (pattern: SavedPattern) => {
    logger.info('Editing pattern', { id: pattern.id, name: pattern.name });
    setEditingPattern(pattern);
    setIsCreatingNew(false);
  };

  const handleSave = async (patternData: {
    name: string;
    system: '8h' | '12h';
    sequence: string[];
  }) => {
    logger.info('Saving pattern', patternData);
    setIsSaving(true);

    try {
      // Validate sequence has at least one rest day
      if (!patternData.sequence.includes('R')) {
        toast({
          title: 'Invalid pattern',
          description: 'Pattern must include at least one Rest day (R)',
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      const result = await savePattern({
        siteId: tenantId,
        name: patternData.name,
        system: patternData.system,
        sequence: patternData.sequence as any,
        repeatWeeks: Math.ceil(patternData.sequence.length / 7),
      });

      if (result.ok) {
        logger.info('Pattern saved successfully', { id: result.id });
        toast({
          title: 'Pattern saved',
          description: `"${patternData.name}" has been saved successfully`,
        });
        setIsCreatingNew(false);
        setEditingPattern(null);
        await loadPatterns();
      } else {
        throw new Error('Failed to save pattern');
      }
    } catch (error) {
      logger.error('Failed to save pattern', { error });
      toast({
        title: 'Error saving pattern',
        description: 'Failed to save shift pattern',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (pattern: SavedPattern) => {
    logger.info('Deleting pattern', { id: pattern.id, name: pattern.name });
    setDeleteConfirmPattern(pattern);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmPattern) return;

    logger.info('Confirming delete', { id: deleteConfirmPattern.id });
    try {
      const success = await deletePattern(deleteConfirmPattern.id);
      if (success) {
        logger.info('Pattern deleted successfully');
        toast({
          title: 'Pattern deleted',
          description: `"${deleteConfirmPattern.name}" has been deleted`,
        });
        await loadPatterns();
      } else {
        throw new Error('Failed to delete pattern');
      }
    } catch (error) {
      logger.error('Failed to delete pattern', { error });
      toast({
        title: 'Error deleting pattern',
        description: 'Failed to delete shift pattern',
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirmPattern(null);
    }
  };

  const handleCancel = () => {
    logger.info('Canceling edit/create');
    setIsCreatingNew(false);
    setEditingPattern(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading patterns...</div>
      </div>
    );
  }

  if (isCreatingNew || editingPattern) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <PatternEditor
          pattern={
            editingPattern
              ? {
                  id: editingPattern.id,
                  name: editingPattern.name,
                  shift_type: editingPattern.system,
                  pattern: editingPattern.sequence,
                }
              : undefined
          }
          isNew={!editingPattern}
          onSave={(data) =>
            handleSave({
              name: data.name,
              system: data.shift_type,
              sequence: data.pattern,
            })
          }
          onCancel={handleCancel}
          onDelete={
            editingPattern
              ? () => handleDelete(editingPattern)
              : undefined
          }
          isSaving={isSaving}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Shift Patterns</h1>
        <p className="text-muted-foreground">
          Define custom shift patterns for your site
        </p>
      </div>

      <div className="mb-6">
        <Button onClick={handleCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Pattern
        </Button>
      </div>

      {patterns.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              No patterns defined. Create your first shift pattern to get started.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {patterns.map((pattern) => (
            <Card key={pattern.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{pattern.name}</CardTitle>
                    <CardDescription>
                      {pattern.system} • {pattern.sequence.length} days
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(pattern)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(pattern)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {pattern.sequence.map((code, idx) => (
                    <div
                      key={idx}
                      className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium ${
                        code === 'D'
                          ? 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100'
                          : code === 'E'
                          ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                          : code === 'L'
                          ? 'bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100'
                          : code === 'N'
                          ? 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100'
                          : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                      }`}
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!deleteConfirmPattern}
        onOpenChange={(open) => !open && setDeleteConfirmPattern(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pattern</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmPattern?.name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
