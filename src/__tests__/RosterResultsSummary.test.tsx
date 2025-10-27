import React from 'react';
import { render } from '@testing-library/react';
import { screen, fireEvent } from '@testing-library/dom';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { RosterResultsSummary } from '@/components/roster/RosterResultsSummary';
import { RosterGenerationResult } from '@/features/roster/types';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('RosterResultsSummary', () => {
  const excellentResult: RosterGenerationResult = {
    coverageAchieved: {
      total: 97.5,
      byShift: {
        day: 98.2,
        night: 96.8,
        early: 97.1,
        late: 97.9
      }
    },
    fairnessStats: {
      nights: { min: 4, avg: 4.8, max: 5 },
      weekends: { min: 3, avg: 3.5, max: 4 },
      publicHolidays: { min: 1, avg: 1.6, max: 2 }
    },
    cost: {
      total: 48750.25,
      budgetVariance: -250.00
    },
    violations: [],
    generatedVersionId: 'version-123'
  };

  const problematicResult: RosterGenerationResult = {
    coverageAchieved: {
      total: 82.3,
      byShift: {
        day: 85.1,
        night: 78.5,
        early: 83.2,
        late: 82.4
      }
    },
    fairnessStats: {
      nights: { min: 2, avg: 6.2, max: 9 },
      weekends: { min: 1, avg: 4.1, max: 7 },
      publicHolidays: { min: 0, avg: 2.3, max: 5 }
    },
    cost: {
      total: 52340.50,
      budgetVariance: 2340.50
    },
    violations: [
      'Staff member John Smith assigned to night shift after insufficient rest period',
      'Weekend coverage falls below minimum requirements on 2024-06-15',
      'Public holiday staffing exceeds cap for Sarah Johnson (3 shifts assigned, cap is 2)'
    ],
    generatedVersionId: 'version-456'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Excellent Results Display', () => {
    it('renders excellent result with all sections', () => {
      render(
        <BrowserRouter>
          <RosterResultsSummary result={excellentResult} />
        </BrowserRouter>
      );
      
      expect(screen.getByText('Roster Generation Results')).toBeInTheDocument();
      expect(screen.getByText('97.5%')).toBeInTheDocument();
      expect(screen.getByText('£48,750.25')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // violations count
    });

    it('shows success indicators for excellent coverage', () => {
      render(
        <BrowserRouter>
          <RosterResultsSummary result={excellentResult} />
        </BrowserRouter>
      );
      
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    it('displays budget variance correctly for under-budget', () => {
      render(
        <BrowserRouter>
          <RosterResultsSummary result={excellentResult} />
        </BrowserRouter>
      );
      
      expect(screen.getByText('-£250.00 vs budget')).toBeInTheDocument();
    });

    it('shows fairness statistics', () => {
      render(
        <BrowserRouter>
          <RosterResultsSummary result={excellentResult} />
        </BrowserRouter>
      );
      
      // Night shifts stats
      expect(screen.getByText('4')).toBeInTheDocument(); // min nights
      expect(screen.getByText('4.8')).toBeInTheDocument(); // avg nights
      expect(screen.getByText('5')).toBeInTheDocument(); // max nights
    });

    it('shows coverage by shift type', () => {
      render(
        <BrowserRouter>
          <RosterResultsSummary result={excellentResult} />
        </BrowserRouter>
      );
      
      expect(screen.getByText('98.2%')).toBeInTheDocument(); // day coverage
      expect(screen.getByText('96.8%')).toBeInTheDocument(); // night coverage
    });

    it('shows success message for excellent results', () => {
      render(
        <BrowserRouter>
          <RosterResultsSummary result={excellentResult} />
        </BrowserRouter>
      );
      
      expect(screen.getByText(/Excellent! Your roster meets all compliance requirements/)).toBeInTheDocument();
    });
  });

  describe('Problematic Results Display', () => {
    it('renders problematic result with warning indicators', () => {
      render(
        <BrowserRouter>
          <RosterResultsSummary result={problematicResult} />
        </BrowserRouter>
      );
      
      expect(screen.getByText('82.3%')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // violations count
      expect(screen.getByText('+£2,340.50 vs budget')).toBeInTheDocument();
    });

    it('displays all violations', () => {
      render(
        <BrowserRouter>
          <RosterResultsSummary result={problematicResult} />
        </BrowserRouter>
      );
      
      expect(screen.getByText('Compliance Violations')).toBeInTheDocument();
      expect(screen.getByText(/Staff member John Smith assigned to night shift/)).toBeInTheDocument();
      expect(screen.getByText(/Weekend coverage falls below minimum/)).toBeInTheDocument();
      expect(screen.getByText(/Public holiday staffing exceeds cap/)).toBeInTheDocument();
    });

    it('shows needs attention badges for poor coverage', () => {
      render(
        <BrowserRouter>
          <RosterResultsSummary result={problematicResult} />
        </BrowserRouter>
      );
      
      expect(screen.getByText('Needs Attention')).toBeInTheDocument();
    });

    it('calculates fairness score correctly for poor distribution', () => {
      render(
        <BrowserRouter>
          <RosterResultsSummary result={problematicResult} />
        </BrowserRouter>
      );
      
      // Should show lower fairness score due to high variance
      const fairnessScoreElements = screen.getAllByText(/^\d+%$/);
      const fairnessScore = fairnessScoreElements.find(el => 
        parseInt(el.textContent!) < 50 // Low score for poor fairness
      );
      expect(fairnessScore).toBeInTheDocument();
    });
  });

  describe('View Roster Functionality', () => {
    it('shows view roster button when version ID exists', () => {
      render(
        <BrowserRouter>
          <RosterResultsSummary result={excellentResult} />
        </BrowserRouter>
      );
      
      const viewButton = screen.getByRole('button', { name: /view roster/i });
      expect(viewButton).toBeInTheDocument();
    });

    it('navigates to roster when view button clicked', () => {
      render(
        <BrowserRouter>
          <RosterResultsSummary result={excellentResult} />
        </BrowserRouter>
      );
      
      const viewButton = screen.getByRole('button', { name: /view roster/i });
      fireEvent.click(viewButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/roster/version-123');
    });

    it('does not show view button when no version ID', () => {
      const resultWithoutVersion = { ...excellentResult, generatedVersionId: undefined };
      
      render(
        <BrowserRouter>
          <RosterResultsSummary result={resultWithoutVersion} />
        </BrowserRouter>
      );
      
      expect(screen.queryByRole('button', { name: /view roster/i })).not.toBeInTheDocument();
    });
  });

  describe('Currency Formatting', () => {
    it('formats currency correctly', () => {
      render(
        <BrowserRouter>
          <RosterResultsSummary result={excellentResult} />
        </BrowserRouter>
      );
      
      expect(screen.getByText('£48,750.25')).toBeInTheDocument();
    });

    it('formats budget variance with correct signs', () => {
      render(
        <BrowserRouter>
          <RosterResultsSummary result={problematicResult} />
        </BrowserRouter>
      );
      
      expect(screen.getByText('+£2,340.50 vs budget')).toBeInTheDocument();
    });
  });

  describe('Coverage Status Indicators', () => {
    it('shows correct status for different coverage levels', () => {
      const lowCoverageResult = {
        ...excellentResult,
        coverageAchieved: { ...excellentResult.coverageAchieved, total: 78.5 }
      };
      
      render(
        <BrowserRouter>
          <RosterResultsSummary result={lowCoverageResult} />
        </BrowserRouter>
      );
      
      expect(screen.getByText('78.5%')).toBeInTheDocument();
    });
  });

  describe('Variance Calculations', () => {
    it('displays variance badges correctly', () => {
      render(
        <BrowserRouter>
          <RosterResultsSummary result={problematicResult} />
        </BrowserRouter>
      );
      
      // Check for variance displays in fairness stats
      const varianceElements = screen.getAllByText(/Variance: \d+/);
      expect(varianceElements.length).toBeGreaterThan(0);
    });
  });
});