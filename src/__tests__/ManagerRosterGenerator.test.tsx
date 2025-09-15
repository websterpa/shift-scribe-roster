import React from 'react';
import { render } from '@testing-library/react';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { ManagerRosterGenerator, ManagerRosterConfig, RosterGenerationResult } from '@/components/roster/ManagerRosterGenerator';

// Mock dependencies
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  toast: mockToast
}));

describe('ManagerRosterGenerator', () => {
  const mockOnGenerate = vi.fn();
  const defaultProps = {
    onGenerateRoster: mockOnGenerate,
    isGenerating: false,
    lastResult: null
  };

  const mockResult: RosterGenerationResult = {
    coverageAchieved: {
      total: 95.5,
      byShift: {
        day: 96.2,
        night: 94.8,
        early: 95.1,
        late: 95.9
      }
    },
    fairnessStats: {
      nights: { min: 3, avg: 4.2, max: 5 },
      weekends: { min: 2, avg: 3.1, max: 4 },
      publicHolidays: { min: 0, avg: 1.2, max: 2 }
    },
    cost: {
      total: 45230.50,
      budgetVariance: -1500.00
    },
    violations: [],
    generatedVersionId: 'test-version-123'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders all main sections', () => {
      render(<ManagerRosterGenerator {...defaultProps} />);
      
      expect(screen.getByText('Manager Roster Generation')).toBeInTheDocument();
      expect(screen.getByText('Basic Configuration')).toBeInTheDocument();
      expect(screen.getByText('Overtime Defaults')).toBeInTheDocument();
      expect(screen.getByText('Optional Constraints')).toBeInTheDocument();
      expect(screen.getByText('Coverage Targets')).toBeInTheDocument();
    });

    it('shows default values correctly', () => {
      render(<ManagerRosterGenerator {...defaultProps} />);
      
      expect(screen.getByDisplayValue('12h')).toBeInTheDocument();
      expect(screen.getByDisplayValue('07:00')).toBeInTheDocument();
      expect(screen.getByDisplayValue('17')).toBeInTheDocument();
      expect(screen.getByDisplayValue('4')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10:00')).toBeInTheDocument();
    });

    it('shows progress tracker when generating', () => {
      render(<ManagerRosterGenerator {...defaultProps} isGenerating={true} />);
      
      expect(screen.getByText('Optimising Roster')).toBeInTheDocument();
    });

    it('shows results summary when last result exists', () => {
      render(<ManagerRosterGenerator {...defaultProps} lastResult={mockResult} />);
      
      expect(screen.getByText('Roster Generation Results')).toBeInTheDocument();
      expect(screen.getByText('95.5%')).toBeInTheDocument();
    });
  });

  describe('Configuration Changes', () => {
    it('updates shift system selection', async () => {
      const user = userEvent.setup();
      render(<ManagerRosterGenerator {...defaultProps} />);
      
      const shiftSelect = screen.getByRole('combobox', { name: /shift system/i });
      await user.click(shiftSelect);
      await user.click(screen.getByText('8 Hour Shifts'));
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('8h')).toBeInTheDocument();
      });
    });

    it('updates weeks input', async () => {
      const user = userEvent.setup();
      render(<ManagerRosterGenerator {...defaultProps} />);
      
      const weeksInput = screen.getByLabelText('Roster Weeks');
      await user.clear(weeksInput);
      await user.type(weeksInput, '26');
      
      expect(weeksInput).toHaveValue(26);
    });

    it('updates OT hours with decimal values', async () => {
      const user = userEvent.setup();
      render(<ManagerRosterGenerator {...defaultProps} />);
      
      const otHoursInput = screen.getByLabelText('Default OT Hours');
      await user.clear(otHoursInput);
      await user.type(otHoursInput, '6.5');
      
      expect(otHoursInput).toHaveValue(6.5);
    });

    it('toggles supervisor nights switch', async () => {
      const user = userEvent.setup();
      render(<ManagerRosterGenerator {...defaultProps} />);
      
      const supervisorSwitch = screen.getByLabelText('Allow Supervisor Nights');
      await user.click(supervisorSwitch);
      
      expect(supervisorSwitch).toBeChecked();
    });
  });

  describe('Form Validation', () => {
    it('validates coverage targets JSON', async () => {
      const user = userEvent.setup();
      render(<ManagerRosterGenerator {...defaultProps} />);
      
      const coverageTextarea = screen.getByLabelText('Coverage Requirements (JSON)');
      await user.clear(coverageTextarea);
      await user.type(coverageTextarea, 'invalid json');
      
      expect(screen.getByText('Invalid JSON format')).toBeInTheDocument();
    });

    it('validates week count boundaries', async () => {
      const user = userEvent.setup();
      render(<ManagerRosterGenerator {...defaultProps} />);
      
      const weeksInput = screen.getByLabelText('Roster Weeks');
      
      // Test upper boundary
      await user.clear(weeksInput);
      await user.type(weeksInput, '100');
      
      const generateBtn = screen.getByRole('button', { name: /generate roster/i });
      await user.click(generateBtn);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Invalid Week Count",
          description: "Week count must be between 1 and 52",
          variant: "destructive"
        });
      });
    });

    it('disables generate button with invalid config', async () => {
      const user = userEvent.setup();
      render(<ManagerRosterGenerator {...defaultProps} />);
      
      const coverageTextarea = screen.getByLabelText('Coverage Requirements (JSON)');
      await user.clear(coverageTextarea);
      await user.type(coverageTextarea, 'invalid');
      
      const generateBtn = screen.getByRole('button', { name: /generate roster/i });
      expect(generateBtn).toBeDisabled();
    });
  });

  describe('Roster Generation', () => {
    it('calls onGenerateRoster with correct config', async () => {
      const user = userEvent.setup();
      render(<ManagerRosterGenerator {...defaultProps} />);
      
      // Update some configuration
      const weeksInput = screen.getByLabelText('Roster Weeks');
      await user.clear(weeksInput);
      await user.type(weeksInput, '20');
      
      const generateBtn = screen.getByRole('button', { name: /generate roster/i });
      await user.click(generateBtn);
      
      await waitFor(() => {
        expect(mockOnGenerate).toHaveBeenCalledWith(
          expect.objectContaining({
            weeks: 20,
            shiftSystem: '12h',
            siteStartTime: '07:00',
            timezone: 'Europe/London'
          })
        );
      });
    });

    it('shows generating state during generation', async () => {
      const user = userEvent.setup();
      render(<ManagerRosterGenerator {...defaultProps} isGenerating={true} />);
      
      const generateBtn = screen.getByRole('button', { name: /generating/i });
      expect(generateBtn).toBeDisabled();
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('handles generation errors', async () => {
      const user = userEvent.setup();
      const mockError = new Error('Generation failed');
      const mockOnGenerateError = vi.fn().mockRejectedValue(mockError);
      
      render(<ManagerRosterGenerator {...defaultProps} onGenerateRoster={mockOnGenerateError} />);
      
      const generateBtn = screen.getByRole('button', { name: /generate roster/i });
      await user.click(generateBtn);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Generation Failed",
          description: "Generation failed",
          variant: "destructive"
        });
      });
    });
  });

  describe('Optional Constraints', () => {
    it('handles budget input', async () => {
      const user = userEvent.setup();
      render(<ManagerRosterGenerator {...defaultProps} />);
      
      const budgetInput = screen.getByLabelText('Budget (£)');
      await user.type(budgetInput, '50000');
      
      expect(budgetInput).toHaveValue(50000);
    });

    it('handles public holiday cap', async () => {
      const user = userEvent.setup();
      render(<ManagerRosterGenerator {...defaultProps} />);
      
      const phCapInput = screen.getByLabelText('PH Cap (shifts)');
      await user.type(phCapInput, '3');
      
      expect(phCapInput).toHaveValue(3);
    });

    it('clears optional fields when emptied', async () => {
      const user = userEvent.setup();
      render(<ManagerRosterGenerator {...defaultProps} />);
      
      const budgetInput = screen.getByLabelText('Budget (£)');
      await user.type(budgetInput, '1000');
      await user.clear(budgetInput);
      
      const generateBtn = screen.getByRole('button', { name: /generate roster/i });
      await user.click(generateBtn);
      
      await waitFor(() => {
        expect(mockOnGenerate).toHaveBeenCalledWith(
          expect.objectContaining({
            budget: undefined
          })
        );
      });
    });
  });

  describe('Time Format Validation', () => {
    it('accepts valid time formats', async () => {
      const user = userEvent.setup();
      render(<ManagerRosterGenerator {...defaultProps} />);
      
      const timeInput = screen.getByLabelText('Site Start Time');
      await user.clear(timeInput);
      await user.type(timeInput, '08:30');
      
      const generateBtn = screen.getByRole('button', { name: /generate roster/i });
      expect(generateBtn).not.toBeDisabled();
    });
  });
});