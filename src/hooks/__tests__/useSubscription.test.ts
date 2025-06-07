
import { renderHook, act } from '@testing-library/react';
import { useSubscription } from '../useSubscription';
import { useSupabaseAuth } from '../useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
jest.mock('../useSupabaseAuth');
jest.mock('@/integrations/supabase/client');
jest.mock('@/utils/errorLogger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockUseSupabaseAuth = useSupabaseAuth as jest.MockedFunction<typeof useSupabaseAuth>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useSubscription', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default auth state
    mockUseSupabaseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      loading: false,
      session: null,
      signOut: jest.fn(),
    });
  });

  describe('Admin user with is_admin = true in staff_profiles', () => {
    it('should return hasProAccess = true even without Stripe subscription', async () => {
      // Mock admin RPC call returning true
      mockSupabase.rpc.mockResolvedValueOnce({
        data: true,
        error: null,
      });

      // Mock subscription query returning no subscription
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: null,
              error: { message: 'No subscription found' },
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useSubscription());

      // Wait for async operations to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isAdmin).toBe(true);
      expect(result.current.hasProAccess).toBe(true);
      expect(result.current.canViewRosters).toBe(true);
      expect(result.current.subscription).toBe(null);
    });
  });

  describe('Non-admin user with valid Pro subscription', () => {
    it('should return hasProAccess = true', async () => {
      // Mock admin RPC call returning false
      mockSupabase.rpc.mockResolvedValueOnce({
        data: false,
        error: null,
      });

      // Mock subscription query returning active pro subscription
      const mockSubscription = {
        id: 'sub-123',
        subscription_tier: 'pro',
        subscription_status: 'active',
        subscription_start_date: '2024-01-01',
        subscription_end_date: '2024-12-31',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: mockSubscription,
              error: null,
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useSubscription());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.hasProAccess).toBe(true);
      expect(result.current.canViewRosters).toBe(true);
      expect(result.current.subscription).toEqual(mockSubscription);
    });
  });

  describe('Non-admin user with free subscription', () => {
    it('should return hasProAccess = false', async () => {
      // Mock admin RPC call returning false
      mockSupabase.rpc.mockResolvedValueOnce({
        data: false,
        error: null,
      });

      // Mock subscription query returning free subscription
      const mockSubscription = {
        id: 'sub-123',
        subscription_tier: 'free',
        subscription_status: 'active',
        subscription_start_date: '2024-01-01',
        subscription_end_date: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: mockSubscription,
              error: null,
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useSubscription());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.hasProAccess).toBe(false);
      expect(result.current.canViewRosters).toBe(false);
      expect(result.current.subscription?.subscription_tier).toBe('free');
    });
  });

  describe('Non-admin user with expired Pro subscription', () => {
    it('should return hasProAccess = false', async () => {
      // Mock admin RPC call returning false
      mockSupabase.rpc.mockResolvedValueOnce({
        data: false,
        error: null,
      });

      // Mock subscription query returning expired pro subscription
      const mockSubscription = {
        id: 'sub-123',
        subscription_tier: 'pro',
        subscription_status: 'active',
        subscription_start_date: '2023-01-01',
        subscription_end_date: '2023-12-31', // Expired
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: mockSubscription,
              error: null,
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useSubscription());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.hasProAccess).toBe(false);
      expect(result.current.canViewRosters).toBe(false);
      expect(result.current.subscription?.subscription_tier).toBe('pro');
    });
  });

  describe('Non-admin user with cancelled Pro subscription', () => {
    it('should return hasProAccess = false', async () => {
      // Mock admin RPC call returning false
      mockSupabase.rpc.mockResolvedValueOnce({
        data: false,
        error: null,
      });

      // Mock subscription query returning cancelled pro subscription
      const mockSubscription = {
        id: 'sub-123',
        subscription_tier: 'pro',
        subscription_status: 'cancelled',
        subscription_start_date: '2024-01-01',
        subscription_end_date: '2024-12-31',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: mockSubscription,
              error: null,
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useSubscription());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.hasProAccess).toBe(false);
      expect(result.current.canViewRosters).toBe(false);
      expect(result.current.subscription?.subscription_status).toBe('cancelled');
    });
  });

  describe('Unauthenticated user', () => {
    it('should return default values', () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: false,
        session: null,
        signOut: jest.fn(),
      });

      const { result } = renderHook(() => useSubscription());

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.hasProAccess).toBe(false);
      expect(result.current.canViewRosters).toBe(false);
      expect(result.current.subscription).toBe(null);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('RPC function errors', () => {
    it('should handle RPC errors gracefully and default to non-admin', async () => {
      // Mock admin RPC call returning an error
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC function not found' },
      });

      // Mock subscription query returning no subscription
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: null,
              error: { message: 'No subscription found' },
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useSubscription());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.hasProAccess).toBe(false);
      expect(result.current.subscription).toBe(null);
    });
  });
});
