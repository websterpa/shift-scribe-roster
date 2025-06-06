
import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchInputProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  placeholder?: string;
}

export function SearchInput({ 
  searchTerm, 
  setSearchTerm, 
  placeholder = "Search..." 
}: SearchInputProps) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        className="pl-8"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {searchTerm && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1.5 h-7 w-7 p-0"
          onClick={() => setSearchTerm("")}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
