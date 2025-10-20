
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Plus, Edit, Copy, Trash, Star } from 'lucide-react';

interface Pattern {
  id: string;
  name: string;
  pattern: string[];
  shift_type: '8h' | '12h';
  created_at: string;
  isCustom?: boolean;
}

interface PatternLibraryProps {
  customPatterns: Pattern[];
  commonPatterns: Pattern[];
  selectedShiftType: '8h' | '12h';
  onCreateNew: () => void;
  onEditPattern: (pattern: Pattern) => void;
  onDuplicatePattern: (pattern: Pattern) => void;
  onDeletePattern: (patternId: string) => void;
  onUsePattern: (pattern: Pattern) => void;
  isLoading?: boolean;
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

export function PatternLibrary({
  customPatterns,
  commonPatterns,
  selectedShiftType,
  onCreateNew,
  onEditPattern,
  onDuplicatePattern,
  onDeletePattern,
  onUsePattern,
  isLoading = false
}: PatternLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomPatterns = customPatterns.filter(pattern =>
    pattern.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pattern.pattern.join('').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCommonPatterns = commonPatterns.filter(pattern =>
    pattern.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pattern.pattern.join('').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const PatternCard = ({ pattern, isCustom = false }: { pattern: Pattern; isCustom?: boolean }) => (
    <Card className="relative hover:shadow-md transition-shadow" data-testid="pattern-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {pattern.name}
              {isCustom && <Star className="h-4 w-4 text-yellow-500" />}
            </CardTitle>
            <div className="text-sm text-muted-foreground mt-1">
              {pattern.shift_type} • {pattern.pattern.length}-day cycle
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {pattern.shift_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Pattern Preview */}
        <div className="flex flex-wrap gap-1">
          {pattern.pattern.slice(0, 14).map((code, index) => (
            <Badge key={index} variant="outline" className={`text-xs ${getShiftCodeColor(code)}`}>
              {code}
            </Badge>
          ))}
          {pattern.pattern.length > 14 && (
            <span className="text-xs text-muted-foreground">+{pattern.pattern.length - 14} more</span>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => onUsePattern(pattern)}
            className="flex-1"
          >
            Use Pattern
          </Button>
          {isCustom ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEditPattern(pattern)}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDuplicatePattern(pattern)}
              >
                <Copy className="h-3 w-3" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Trash className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Pattern</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{pattern.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onDeletePattern(pattern.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDuplicatePattern(pattern)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header with Search and Create */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Shift Pattern Library</h2>
          <p className="text-muted-foreground">
            Manage your custom patterns and use common templates
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create Pattern
        </Button>
      </div>

      {/* Search */}
      <div className="relative" data-testid="pattern-selector">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search patterns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* My Patterns Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">My Patterns ({filteredCustomPatterns.length})</h3>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading your patterns...</p>
          </div>
        ) : filteredCustomPatterns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomPatterns.map((pattern) => (
              <PatternCard key={pattern.id} pattern={pattern} isCustom={true} />
            ))}
          </div>
        ) : (
          <Card data-testid="pattern-card-placeholder">
            <CardContent className="text-center py-8">
              <Star className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm ? 'No patterns match your search' : 'No custom patterns yet'}
              </p>
              {!searchTerm && (
                <Button variant="outline" onClick={onCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Pattern
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Common Patterns Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Common {selectedShiftType} Templates ({filteredCommonPatterns.length})
          </h3>
        </div>
        
        {filteredCommonPatterns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCommonPatterns.map((pattern) => (
              <PatternCard key={pattern.id} pattern={pattern} isCustom={false} />
            ))}
          </div>
        ) : (
          <Card data-testid="pattern-card-placeholder">
            <CardContent className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No common patterns match your search
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
