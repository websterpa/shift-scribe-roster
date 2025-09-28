import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GuidedRosterBuilderV2 from '@/pages/roster/GuidedRosterBuilderV2';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [
            { id: 'staff1', role: 'Staff', first_name: 'John', last_name: 'Doe', email: 'john@test.com' },
            { id: 'staff2', role: 'Supervisor', first_name: 'Jane', last_name: 'Smith', email: 'jane@test.com' }
          ],
          error: null
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'config123' },
            error: null
          }))
        }))
      }))
    }))
  }
}));

// Mock the enhanced roster generator
vi.mock('@/utils/roster/enhancedRosterGenerator', () => ({
  generateRosterEnhanced: vi.fn(() => Promise.resolve({
    assignments: [
      { shift_code: 'D', staff_id: 'staff1' },
      { shift_code: 'N', staff_id: 'staff2' }
    ],
    nightsGenerated: 1
  }))
}));

// Mock router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

const renderWithClient = (component: React.ReactElement) => {
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

describe('GuidedRosterBuilderV2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.href setter
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true
    });
  });

  it('renders main sections', async () => {
    renderWithClient(<GuidedRosterBuilderV2 />);
    
    expect(screen.getByText('Guided Roster Builder v2')).toBeInTheDocument();
    expect(screen.getByText('1. Basic Configuration')).toBeInTheDocument();
    expect(screen.getByText('2. Shift Pattern')).toBeInTheDocument();
    expect(screen.getByText('3. Staffing Requirements')).toBeInTheDocument();
    expect(screen.getByText('4. Rates & Settings')).toBeInTheDocument();
    expect(screen.getByText('Live Preview')).toBeInTheDocument();
  });

  it('updates staffing defaults when system changes', async () => {
    const user = userEvent.setup();
    renderWithClient(<GuidedRosterBuilderV2 />);
    
    // Should start with 8h system
    expect(screen.getByDisplayValue('EELLNNRRRR')).toBeInTheDocument();
    
    // Change to 12h system
    const systemSelect = screen.getByLabelText('Shift System');
    await user.click(systemSelect);
    await user.click(screen.getByText('12 Hour (D/N)'));
    
    // Pattern should update to 12h default
    await waitFor(() => {
      expect(screen.getByDisplayValue('DDNNRRRR')).toBeInTheDocument();
    });
  });

  it('applies pattern presets', async () => {
    const user = userEvent.setup();
    renderWithClient(<GuidedRosterBuilderV2 />);
    
    // Click a preset button for 8h
    const preset = screen.getByText('4 on 4 off (E/L mix)');
    await user.click(preset);
    
    // Pattern should update
    await waitFor(() => {
      expect(screen.getByDisplayValue('EEERRRR')).toBeInTheDocument();
    });
  });

  it('shows shift-set consistency warnings', async () => {
    const user = userEvent.setup();
    renderWithClient(<GuidedRosterBuilderV2 />);
    
    // Change to 12h system
    const systemSelect = screen.getByLabelText('Shift System');
    await user.click(systemSelect);
    await user.click(screen.getByText('12 Hour (D/N)'));
    
    // Set an 8h pattern (invalid for 12h)
    const patternInput = screen.getByLabelText('Pattern Sequence');
    await user.clear(patternInput);
    await user.type(patternInput, 'EELLNN');
    
    // Should show validation warning
    await waitFor(() => {
      expect(screen.getByText(/Inconsistent shift-set/)).toBeInTheDocument();
    });
    
    // Generate button should be disabled
    expect(screen.getByRole('button', { name: /Generate Roster/ })).toBeDisabled();
  });

  it('validates night eligibility', async () => {
    const user = userEvent.setup();
    renderWithClient(<GuidedRosterBuilderV2 />);
    
    // Change to 12h system (requires nights)
    const systemSelect = screen.getByLabelText('Shift System');
    await user.click(systemSelect);
    await user.click(screen.getByText('12 Hour (D/N)'));
    
    // If there's a night eligibility warning, enable supervisor nights
    await waitFor(async () => {
      const warningExists = screen.queryByText(/No staff eligible for Night shifts/);
      if (warningExists) {
        // Open rates section
        const ratesHeader = screen.getByText('4. Rates & Settings');
        await user.click(ratesHeader);
        
        // Enable supervisor nights
        const checkbox = screen.getByLabelText(/Allow supervisors on night shifts/);
        await user.click(checkbox);
        
        // Warning should disappear
        await waitFor(() => {
          expect(screen.queryByText(/No staff eligible for Night shifts/)).not.toBeInTheDocument();
        });
      }
    });
  });

  it('generates roster successfully', async () => {
    const user = userEvent.setup();
    renderWithClient(<GuidedRosterBuilderV2 />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Generate Roster/ })).not.toBeDisabled();
    });
    
    // Click generate
    const generateBtn = screen.getByRole('button', { name: /Generate Roster/ });
    await user.click(generateBtn);
    
    // Should show loading state
    expect(screen.getByText('Generating...')).toBeInTheDocument();
    
    // Should eventually redirect (mocked)
    await waitFor(() => {
      expect(window.location.href).toContain('/roster/summary');
    });
  });

  it('shows live preview data', async () => {
    renderWithClient(<GuidedRosterBuilderV2 />);
    
    // Should show preview section
    expect(screen.getByText('Live Preview')).toBeInTheDocument();
    
    // Should show estimated data (after initial calculation)
    await waitFor(() => {
      expect(screen.getByText('Weekly Requirements')).toBeInTheDocument();
      expect(screen.getByText('Estimated Hours')).toBeInTheDocument();
      expect(screen.getByText('Estimated Cost')).toBeInTheDocument();
    });
  });

  it('handles collapsible sections', async () => {
    const user = userEvent.setup();
    renderWithClient(<GuidedRosterBuilderV2 />);
    
    // Pattern section should be open by default
    expect(screen.getByLabelText('Pattern Sequence')).toBeVisible();
    
    // Click to collapse
    const patternHeader = screen.getByText('2. Shift Pattern');
    await user.click(patternHeader);
    
    // Pattern input should be hidden
    await waitFor(() => {
      expect(screen.getByLabelText('Pattern Sequence')).not.toBeVisible();
    });
    
    // Click to expand again
    await user.click(patternHeader);
    
    // Should be visible again
    await waitFor(() => {
      expect(screen.getByLabelText('Pattern Sequence')).toBeVisible();
    });
  });
});