/**
 * Centralized route definitions for the application.
 * 
 * When routes change in the router, update these constants to ensure
 * all navigation calls remain consistent across the codebase.
 * 
 * Actual route definitions: src/components/router/AppRouter.tsx
 */

export const routes = {
  /**
   * Roster Builder landing page - loads live roster_config defaults.
   * Route: /roster/builder
   * Component: GuidedRosterBuilderV2
   */
  rosterBuilder: '/roster/builder',

  /**
   * Monthly roster view - displays a specific roster version for a given month.
   * Route: /roster/monthly?month=YYYY-MM&version=uuid
   * Component: MonthlyPage
   */
  rosterMonthly: (params: { month: string; versionId: string }) => 
    `/roster/monthly?month=${params.month}&version=${params.versionId}`,

  /**
   * Dashboard landing page
   */
  dashboard: '/dashboard',

  /**
   * Feasibility calculator
   */
  feasibility: '/feasibility',
} as const;
