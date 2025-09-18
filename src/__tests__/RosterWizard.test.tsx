import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import RosterWizard from '@/components/RosterWizard';

// Mock hooks
const mockToast = vi.fn();
const mockRun = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

vi.mock('@/hooks/useRosterGenerator', () => ({
  useRosterGenerator: () => ({
    optimising: false,
    result: null,
    error: null,
    run: mockRun
  })
}));

vi.mock('@/utils/coveragePresets', () => ({
  computeWeeklyTotals: vi.fn(() => ({
    byShift: { E: 10, L: 10, N: 5 },
    overall: 25
  })),
  computeEstimatedWeeklyHours: vi.fn(() => ({
    byShift: { E: 80, L: 80, N: 40 },
    overall: 200
  }))
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('RosterWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders wizard with initial step', () => {
    renderWithRouter(<RosterWizard />);
    
    expect(screen.getByText('Roster Wizard')).toBeInTheDocument();
    expect(screen.getByText('Quickly define a repeating pattern and site configuration, then generate your roster.')).toBeInTheDocument();
    expect(screen.getByText('1. Basics')).toBeInTheDocument();
  });

  it('shows step navigation', () => {
    renderWithRouter(<RosterWizard />);
    
    const stepItems = ['Basics', 'Pattern', 'Coverage', 'Rates & Budget', 'Review & Generate'];
    stepItems.forEach(step => {
      expect(screen.getByText(new RegExp(step))).toBeInTheDocument();
    });
  });

  it('validates and navigates between steps', async () => {
    renderWithRouter(<RosterWizard />);
    
    // Should be on step 1
    expect(screen.getByText('Shift system')).toBeInTheDocument();
    
    // Click Next to go to step 2
    const nextButton = screen.getByRole('button', { name: /Next →/ });
    fireEvent.click(nextButton);
    
    // Should now be on step 2
    await waitFor(() => {
      expect(screen.getByText('Choose a preset')).toBeInTheDocument();
    });
    
    // Back button should work
    const backButton = screen.getByRole('button', { name: /← Back/ });
    fireEvent.click(backButton);
    
    // Should be back to step 1
    await waitFor(() => {
      expect(screen.getByText('Shift system')).toBeInTheDocument();
    });
  });

  it('validates site start time format', async () => {
    renderWithRouter(<RosterWizard />);
    
    // Set invalid time format
    const timeInput = screen.getByDisplayValue('06:00');
    fireEvent.change(timeInput, { target: { value: '25:99' } });
    
    // Try to go to next step
    const nextButton = screen.getByRole('button', { name: /Next →/ });
    fireEvent.click(nextButton);
    
    // Should show validation error
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Validation Error",
        description: "Site start time must be HH:mm.",
        variant: "destructive"
      });
    });
  });

  it('shows pattern presets for 8h system', async () => {
    renderWithRouter(<RosterWizard />);
    
    // Navigate to step 2
    const nextButton = screen.getByRole('button', { name: /Next →/ });
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('2E–2L–2N–4O')).toBeInTheDocument();
      expect(screen.getByText('4 on 4 off (E/L mix)')).toBeInTheDocument();
      expect(screen.getByText('Nights-leaning')).toBeInTheDocument();
    });
  });

  it('switches to 12h presets when system changes', async () => {
    renderWithRouter(<RosterWizard />);
    
    // Change to 12h system
    const systemSelect = screen.getByDisplayValue('8h (E/L/N)');
    fireEvent.change(systemSelect, { target: { value: '12h' } });
    
    // Navigate to step 2
    const nextButton = screen.getByRole('button', { name: /Next →/ });
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('4D–4O–4N–4O')).toBeInTheDocument();
      expect(screen.getByText('Days-only 4 on 4 off')).toBeInTheDocument();
      expect(screen.getByText('2D–2N–4O')).toBeInTheDocument();
    });
  });

  it('allows custom pattern building', async () => {
    renderWithRouter(<RosterWizard />);
    
    // Navigate to step 2
    const nextButton = screen.getByRole('button', { name: /Next →/ });
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      // Should show pattern tokens
      expect(screen.getByRole('button', { name: 'E' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'L' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'N' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'O' })).toBeInTheDocument();
    });
  });

  it('shows coverage presets', async () => {
    renderWithRouter(<RosterWizard />);
    
    // Navigate to step 3
    const nextButton = screen.getByRole('button', { name: /Next →/ });
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Preset: Small')).toBeInTheDocument();
      expect(screen.getByText('Preset: Standard')).toBeInTheDocument();
      expect(screen.getByText('Preset: Large')).toBeInTheDocument();
    });
  });

  it('shows rates and budget form', async () => {
    renderWithRouter(<RosterWizard />);
    
    // Navigate to step 4
    const nextButton = screen.getByRole('button', { name: /Next →/ });
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Rates (£/hr)')).toBeInTheDocument();
      expect(screen.getByText('Supervisor mix by shift (%)')).toBeInTheDocument();
      expect(screen.getByText('Budget & Threshold')).toBeInTheDocument();
    });
  });

  it('shows review summary on final step', async () => {
    renderWithRouter(<RosterWizard />);
    
    // Navigate to final step
    const nextButton = screen.getByRole('button', { name: /Next →/ });
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(screen.getByText('Weekly totals & estimated hours')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate roster/ })).toBeInTheDocument();
    });
  });

  it('triggers roster generation on final step', async () => {
    renderWithRouter(<RosterWizard />);
    
    // Navigate to final step
    const nextButton = screen.getByRole('button', { name: /Next →/ });
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      const generateButton = screen.getByRole('button', { name: /Generate roster/ });
      fireEvent.click(generateButton);
      
      expect(mockRun).toHaveBeenCalledWith(expect.objectContaining({
        shiftSystem: '8h',
        siteStartLocalTime: '06:00',
        timezone: 'Europe/London',
        weeks: 17
      }));
    });
  });

  it('validates negative rates', async () => {
    renderWithRouter(<RosterWizard />);
    
    // Navigate to step 4
    const nextButton = screen.getByRole('button', { name: /Next →/ });
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      const staffRateInput = screen.getByDisplayValue('18');
      fireEvent.change(staffRateInput, { target: { value: '-5' } });
    });
    
    // Try to go to next step
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Validation Error",
        description: "Rates must be positive.",
        variant: "destructive"
      });
    });
  });
});