
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, FileText, Settings, CheckCircle, X } from 'lucide-react';

interface ActionsFABProps {
  onNewRoster: () => void;
  onOpenPatterns: () => void;
  onOpenCompliance: () => void;
}

export function ActionsFAB({ onNewRoster, onOpenPatterns, onOpenCompliance }: ActionsFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      label: "New Roster",
      icon: Plus,
      onClick: () => {
        onNewRoster();
        setIsOpen(false);
      },
      color: "bg-primary text-primary-foreground"
    },
    {
      label: "Patterns",
      icon: Settings,
      onClick: () => {
        onOpenPatterns();
        setIsOpen(false);
      },
      color: "bg-secondary text-secondary-foreground"
    },
    {
      label: "Compliance",
      icon: CheckCircle,
      onClick: () => {
        onOpenCompliance();
        setIsOpen(false);
      },
      color: "bg-muted text-muted-foreground"
    }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Action Menu */}
      {isOpen && (
        <Card className="mb-4 shadow-lg">
          <CardContent className="p-2">
            <div className="space-y-2">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={action.onClick}
                  className="w-full justify-start gap-3"
                >
                  <div className={`p-1.5 rounded ${action.color}`}>
                    <action.icon className="h-3 w-3" />
                  </div>
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main FAB Button */}
      <Button
        size="icon"
        className={`h-12 w-12 rounded-full shadow-lg transition-transform ${
          isOpen ? 'rotate-45' : 'hover:scale-110'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      </Button>
    </div>
  );
}
