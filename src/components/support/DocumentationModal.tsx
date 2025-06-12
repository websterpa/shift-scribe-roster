
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronRight, Book, Clock, Users, Settings } from 'lucide-react';

interface DocItem {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  content: string;
}

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const documentationItems: DocItem[] = [
  {
    id: '1',
    title: 'Getting Started with CCTV Roster',
    category: 'Quick Start',
    description: 'Learn the basics of setting up your first roster',
    icon: <Book className="w-4 h-4" />,
    content: 'Welcome to CCTV Roster! This guide will help you set up your first roster configuration...'
  },
  {
    id: '2',
    title: 'Managing Staff Profiles',
    category: 'Staff Management',
    description: 'How to add, edit, and manage staff members',
    icon: <Users className="w-4 h-4" />,
    content: 'Staff profiles are the foundation of your roster system. Here\'s how to manage them effectively...'
  },
  {
    id: '3',
    title: 'Creating Shift Patterns',
    category: 'Scheduling',
    description: 'Design custom shift patterns for your team',
    icon: <Clock className="w-4 h-4" />,
    content: 'Shift patterns help you create consistent schedules. You can create custom patterns...'
  },
  {
    id: '4',
    title: 'Leave Request Management',
    category: 'Leave Management',
    description: 'Handle staff leave requests and approvals',
    icon: <Settings className="w-4 h-4" />,
    content: 'Managing leave requests is crucial for maintaining adequate staffing levels...'
  },
  {
    id: '5',
    title: 'Roster Configuration Settings',
    category: 'Configuration',
    description: 'Configure operational hours and staffing requirements',
    icon: <Settings className="w-4 h-4" />,
    content: 'Roster configurations define how your schedules are generated...'
  },
  {
    id: '6',
    title: 'Reports and Analytics',
    category: 'Reporting',
    description: 'Generate reports and analyze roster performance',
    icon: <Book className="w-4 h-4" />,
    content: 'Use our reporting tools to track costs, compliance, and performance metrics...'
  }
];

export function DocumentationModal({ isOpen, onClose }: DocumentationModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<DocItem | null>(null);

  const filteredItems = documentationItems.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = Array.from(new Set(documentationItems.map(item => item.category)));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Documentation & Help Center</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-1 gap-6">
          {/* Sidebar */}
          <div className="w-1/3 border-r pr-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documentation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {categories.map(category => (
                  <div key={category} className="mb-4">
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                      {category}
                    </h4>
                    {filteredItems
                      .filter(item => item.category === category)
                      .map(item => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className="p-3 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            {item.icon}
                            <span className="font-medium text-sm">{item.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      ))
                    }
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* Content */}
          <div className="flex-1">
            {selectedItem ? (
              <ScrollArea className="h-[450px]">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{selectedItem.category}</Badge>
                    <ChevronRight className="w-4 h-4" />
                    <span className="font-semibold">{selectedItem.title}</span>
                  </div>
                  
                  <div className="prose max-w-none">
                    <p className="text-muted-foreground mb-4">
                      {selectedItem.description}
                    </p>
                    
                    <div className="bg-muted p-4 rounded-lg">
                      <p>{selectedItem.content}</p>
                      
                      <div className="mt-4 space-y-2">
                        <h4 className="font-semibold">Quick Steps:</h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm">
                          <li>Navigate to the relevant section in the app</li>
                          <li>Follow the on-screen instructions</li>
                          <li>Save your changes</li>
                          <li>Test the functionality</li>
                        </ol>
                      </div>
                      
                      <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                        <p className="text-sm">
                          <strong>Tip:</strong> If you need further assistance, use the Live Chat feature or contact our support team directly.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-[450px] text-center">
                <div className="space-y-2">
                  <Book className="w-12 h-12 text-muted-foreground mx-auto" />
                  <h3 className="font-semibold">Select a topic</h3>
                  <p className="text-muted-foreground text-sm">
                    Choose a documentation topic from the sidebar to get started
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
