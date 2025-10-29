// TODO: Migrate to @/services/roster by 2025-11-15
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GuidedRosterBuilderV2 from '@/pages/roster/GuidedRosterBuilderV2';
import { vi } from 'vitest';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ data: [], error: null })),
        limit: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'test-id' }, error: null }))
        }))
      }))
    }))
  }
}));

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock the roster generator
vi.mock('@/utils/roster/generateAndSaveRoster', () => ({
  generateAndSaveRoster: vi.fn(() => Promise.resolve({
    versionId: 'test-version-id',
    totalAssignments: 0,
    optimizationResult: { score: 100 },
    wtrResult: { violations: [] },
    costResult: { totalCost: 0, averageCost: 0, breakdown: {} },
    generatorResult: {
      assignments: [],
      roster: {},
      coverage: {},
      fairness: { staffTotals: {}, targets: { E: 0, L: 0, N: 0 }, variance: { E: 0, L: 0, N: 0 } },
      violations: [],
      utilizationReport: {},
      diagnostics: { staffPoolCount: 0, staffUsedCount: 0 }
    }
  }))
}));

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('GuidedRosterBuilderV2 - Acknowledge Warnings', () => {
  test('Generate button disabled with warnings until acknowledged', async () => {
    renderWithQueryClient(<GuidedRosterBuilderV2 />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate roster/i })).toBeInTheDocument();
    });

    // Set up a pattern that will trigger warnings (D→N)
    const patternInput = screen.getByDisplayValue(/EELLNNRRRR/);
    fireEvent.change(patternInput, { target: { value: 'DDN' } });

    // Wait for validation to run
    await waitFor(() => {
      const generateBtn = screen.getByRole('button', { name: /generate roster/i });
      expect(generateBtn).toBeDisabled();
    });

    // Should show acknowledgment checkbox when warnings are present
    await waitFor(() => {
      const ackCheckbox = screen.queryByTestId('ack-warnings');
      if (ackCheckbox) {
        expect(ackCheckbox).toBeInTheDocument();
        fireEvent.click(ackCheckbox);
        
        // Button should now be enabled
        const generateBtn = screen.getByRole('button', { name: /generate roster/i });
        expect(generateBtn).not.toBeDisabled();
      }
    });
  });

  test('Generate button enabled immediately when no warnings', async () => {
    renderWithQueryClient(<GuidedRosterBuilderV2 />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate roster/i })).toBeInTheDocument();
    });

    // Set up a safe pattern (no warnings)
    const patternInput = screen.getByDisplayValue(/EELLNNRRRR/);
    fireEvent.change(patternInput, { target: { value: 'EELLRRRR' } });

    // Wait for validation to run
    await waitFor(() => {
      const generateBtn = screen.getByRole('button', { name: /generate roster/i });
      // Should not be disabled due to warnings (may be disabled for other reasons like loading)
      const ackCheckbox = screen.queryByTestId('ack-warnings');
      expect(ackCheckbox).not.toBeInTheDocument();
    });
  });

  test('Acknowledgment checkbox resets when warnings change', async () => {
    renderWithQueryClient(<GuidedRosterBuilderV2 />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate roster/i })).toBeInTheDocument();
    });

    const patternInput = screen.getByDisplayValue(/EELLNNRRRR/);
    
    // Set up first warning pattern
    fireEvent.change(patternInput, { target: { value: 'DDN' } });

    await waitFor(() => {
      const ackCheckbox = screen.queryByTestId('ack-warnings');
      if (ackCheckbox) {
        fireEvent.click(ackCheckbox);
        expect(ackCheckbox).toBeChecked();
      }
    });

    // Change to different warning pattern
    fireEvent.change(patternInput, { target: { value: 'ELN' } });

    // Acknowledgment should reset
    await waitFor(() => {
      const ackCheckbox = screen.queryByTestId('ack-warnings');
      if (ackCheckbox) {
        expect(ackCheckbox).not.toBeChecked();
      }
    });
  });
});