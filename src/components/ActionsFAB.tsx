
import React, { useState } from 'react';
import { Fab, Action } from 'react-tiny-fab';
import { Plus, Settings, FileText, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import 'react-tiny-fab/dist/styles.css';

interface ActionsFABProps {
  onNewRoster: () => void;
  onOpenPatterns: () => void;
  onOpenCompliance: () => void;
}

export function ActionsFAB({ onNewRoster, onOpenPatterns, onOpenCompliance }: ActionsFABProps) {
  const navigate = useNavigate();

  const handlePatternsClick = () => {
    navigate('/patterns');
  };

  const handleNewRosterClick = () => {
    navigate('/generate-roster');
  };

  return (
    <Fab
      mainButtonStyles={{
        backgroundColor: '#3b82f6',
        color: 'white'
      }}
      style={{ bottom: 20, right: 20 }}
      icon={<Plus />}
      event="hover"
    >
      <Action
        text="New Roster"
        onClick={handleNewRosterClick}
        style={{
          backgroundColor: '#1f2937',
          color: 'white'
        }}
      >
        <Plus />
      </Action>
      
      <Action
        text="Manage Patterns"
        onClick={handlePatternsClick}
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
        style={{
          backgroundColor: '#1f2937',
          color: 'white'
        }}
      >
        <FileText />
      </Action>
    </Fab>
  );
}
