
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Pattern {
  id: string;
  name: string;
  pattern: string[];
  shift_type: '8h' | '12h';
  created_at: string;
}

export function usePatternActions() {
  const [editingPattern, setEditingPattern] = useState<Pattern | null>(null);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPatternName, setNewPatternName] = useState('');
  const [newPatternCodes, setNewPatternCodes] = useState<string[]>(['D', 'D', 'R', 'R', 'R', 'N', 'N']);

  const handleCreateNewPattern = () => {
    console.log('📝 PatternsPanel: Starting new pattern creation');
    setIsCreatingNew(true);
    setNewPatternName('');
    setNewPatternCodes(['D', 'D', 'R', 'R', 'R', 'N', 'N']);
  };

  const handleSaveNewPattern = async (user: any, selectedShiftType: '8h' | '12h', onReload: () => void) => {
    if (!newPatternName.trim() || !user) {
      toast({
        title: "Invalid input",
        description: "Please enter a pattern name",
        variant: "destructive",
      });
      return;
    }

    console.log('💾 PatternsPanel: Saving new pattern:', newPatternName);
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('custom_patterns')
        .insert({
          user_id: user.id,
          name: newPatternName.trim(),
          pattern: newPatternCodes,
          shift_type: selectedShiftType
        });

      if (error) {
        console.error('❌ PatternsPanel: Error creating pattern:', error);
        toast({
          title: "Error creating pattern",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ PatternsPanel: Pattern created successfully');
      toast({
        title: "Pattern created",
        description: `"${newPatternName.trim()}" has been saved`,
      });

      setIsCreatingNew(false);
      setNewPatternName('');
      await onReload();
    } catch (error) {
      console.error('❌ PatternsPanel: Exception creating pattern:', error);
      toast({
        title: "Error creating pattern",
        description: "Failed to create pattern",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelNewPattern = () => {
    setIsCreatingNew(false);
    setNewPatternName('');
  };

  const updatePatternCode = (index: number, code: string) => {
    const newCodes = [...newPatternCodes];
    newCodes[index] = code;
    setNewPatternCodes(newCodes);
  };

  const addPatternDay = () => {
    setNewPatternCodes([...newPatternCodes, 'D']);
  };

  const removePatternDay = (index: number) => {
    if (newPatternCodes.length > 1) {
      const newCodes = newPatternCodes.filter((_, i) => i !== index);
      setNewPatternCodes(newCodes);
    }
  };

  const handleEditPattern = (pattern: Pattern) => {
    console.log('✏️ PatternsPanel: Editing pattern:', pattern);
    setEditingPattern(pattern);
    setEditName(pattern.name);
  };

  const handleSaveEdit = async (onReload: () => void) => {
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
      await onReload();
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

  return {
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
  };
}
