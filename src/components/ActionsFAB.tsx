
import React, { useState } from 'react';
import { Fab, Action } from 'react-tiny-fab';
import { Plus, Settings, FileText, Star } from 'lucide-react';
import 'react-tiny-fab/dist/styles.css';

interface ActionsFABProps {
  onNewRoster: () => void;
  onOpenPatterns: () => void;
  onOpenCompliance: () => void;
}

export function ActionsFAB({ onNewRoster, onOpenPatterns, onOpenCompliance }: ActionsFABProps) {
  return (
    <Fab
      mainButtonStyles={{
        backgroundColor: '#3b82f6',
        color: 'white'
      }}
      actionButtonStyles={{
        backgroundColor: '#1f2937',
        color: 'white'
      }}
      style={{ bottom: 20, right: 20 }}
      icon={<Plus />}
      event="hover"
    >
      <Action
        text="New Roster"
        onClick={onNewRoster}
      >
        <Plus />
      </Action>
      
      {/* PROMINENT PATTERN MANAGEMENT ACTION */}
      <Action
        text="Manage Patterns"
        onClick={onOpenPatterns}
        style={{
          backgroundColor: '#059669',
          color: 'white'
        }}
      >
        <Star />
      </Action>
      
      <Action
        text="Compliance"
        onClick={onOpenCompliance}
      >
        <FileText />
      </Action>
    </Fab>
  );
}
