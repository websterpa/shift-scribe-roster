
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Edit, Save, X, Star } from 'lucide-react';

interface Pattern {
  id: string;
  name: string;
  pattern: string[];
  shift_type: '8h' | '12h';
  created_at: string;
}

interface PatternCardProps {
  pattern: Pattern | any;
  isCustom?: boolean;
  showActions?: boolean;
  isEditing?: boolean;
  editName?: string;
  isSaving?: boolean;
  onEdit?: (pattern: Pattern) => void;
  onUse?: (pattern: any, isCustom: boolean) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  onEditNameChange?: (name: string) => void;
}

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

export function PatternCard({
  pattern,
  isCustom = false,
  showActions = true,
  isEditing = false,
  editName = '',
  isSaving = false,
  onEdit,
  onUse,
  onSaveEdit,
  onCancelEdit,
  onEditNameChange
}: PatternCardProps) {
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
                  onChange={(e) => onEditNameChange?.(e.target.value)}
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
                  onClick={onSaveEdit}
                  disabled={!editName.trim() || isSaving}
                  className="flex-1"
                >
                  <Save className="h-3 w-3 mr-1" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancelEdit}
                  disabled={isSaving}
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={() => onUse?.(pattern, isCustom)}
                  className="flex-1"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Use
                </Button>
                {isCustom && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit?.(pattern)}
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
}
