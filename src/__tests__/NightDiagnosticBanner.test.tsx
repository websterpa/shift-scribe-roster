import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NightDiagnosticBanner } from '@/components/roster/NightDiagnosticBanner';

describe('NightDiagnosticBanner', () => {
  test('shows generator issue when requirements > 0 but assignments = 0', () => {
    render(
      <NightDiagnosticBanner 
        requirementsCount={2} 
        assignmentsCount={0} 
        hasUI={false} 
      />
    );
    
    expect(screen.getByText('Generator Issue Detected')).toBeInTheDocument();
    expect(screen.getByText(/requires 2 Night shifts/)).toBeInTheDocument();
  });

  test('shows UI mapping issue when assignments > 0 but UI shows none', () => {
    render(
      <NightDiagnosticBanner 
        requirementsCount={2} 
        assignmentsCount={5} 
        hasUI={false} 
      />
    );
    
    expect(screen.getByText('UI Mapping Issue')).toBeInTheDocument();
    expect(screen.getByText(/created 5 Night assignments/)).toBeInTheDocument();
  });

  test('shows success when everything works correctly', () => {
    render(
      <NightDiagnosticBanner 
        requirementsCount={2} 
        assignmentsCount={5} 
        hasUI={true} 
      />
    );
    
    expect(screen.getByText('Night Shifts Working Correctly')).toBeInTheDocument();
  });

  test('shows nothing when no requirements and no assignments', () => {
    const { container } = render(
      <NightDiagnosticBanner 
        requirementsCount={0} 
        assignmentsCount={0} 
        hasUI={false} 
      />
    );
    
    expect(container.firstChild).toBeNull();
  });
});