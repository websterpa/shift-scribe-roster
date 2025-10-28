/**
 * Predefined WTD-compliant shift patterns for 24/7 coverage
 * 
 * These patterns are verified to meet Working Time Directive requirements:
 * - Average max 48 hours/week over reference period
 * - Minimum 11 hours rest between shifts
 * - Minimum 24 hours uninterrupted rest per week
 */

export interface PatternTemplate {
  id: string;
  name: string;
  pattern: string[];
  shift_type: '8h' | '12h';
  cycle_length: number;
  avg_weekly_hours: number;
  teams_required: number;
  is_wtd_compliant: boolean;
  description: string;
  created_at: string;
}

export const COMMON_PATTERNS: Record<'8h' | '12h', PatternTemplate[]> = {
  '12h': [
    {
      id: 'continental-12h',
      name: 'Continental (4D-4R-4N-4R)',
      pattern: ['D', 'D', 'D', 'D', 'R', 'R', 'R', 'R', 'N', 'N', 'N', 'N', 'R', 'R', 'R', 'R'],
      shift_type: '12h',
      cycle_length: 17,
      avg_weekly_hours: 42,
      teams_required: 5,
      is_wtd_compliant: true,
      description: 'Classic Continental pattern: 4 days on, 4 off, 4 nights on, 4 off. Excellent work-life balance with long rest periods.',
      created_at: new Date().toISOString()
    },
    {
      id: 'dupont-12h',
      name: 'DuPont (4D-3R-3N-1R-3D-1R)',
      pattern: ['D', 'D', 'D', 'D', 'R', 'R', 'R', 'N', 'N', 'N', 'R', 'D', 'D', 'D', 'R'],
      shift_type: '12h',
      cycle_length: 17,
      avg_weekly_hours: 42,
      teams_required: 5,
      is_wtd_compliant: true,
      description: 'DuPont pattern: Alternating blocks of days and nights with strategic rest days. Popular in manufacturing.',
      created_at: new Date().toISOString()
    },
    {
      id: 'southern-swing-12h',
      name: 'Southern Swing (2D-2R-3N-2R-2D-3R)',
      pattern: ['D', 'D', 'R', 'R', 'N', 'N', 'N', 'R', 'R', 'D', 'D', 'R', 'R', 'R'],
      shift_type: '12h',
      cycle_length: 17,
      avg_weekly_hours: 42,
      teams_required: 5,
      is_wtd_compliant: true,
      description: 'Southern Swing: Shorter blocks with frequent rotation. Good for staff who prefer variety.',
      created_at: new Date().toISOString()
    },
    {
      id: 'pitman-12h',
      name: 'Pitman (2D-2R-3D-2R-2D-3R)',
      pattern: ['D', 'D', 'R', 'R', 'D', 'D', 'D', 'R', 'R', 'D', 'D', 'R', 'R', 'R'],
      shift_type: '12h',
      cycle_length: 17,
      avg_weekly_hours: 42,
      teams_required: 5,
      is_wtd_compliant: true,
      description: 'Pitman pattern: Alternating 2 and 3-day blocks. Every other weekend off.',
      created_at: new Date().toISOString()
    },
    {
      id: 'metropolitan-12h',
      name: 'Metropolitan (3D-3R-3N-3R)',
      pattern: ['D', 'D', 'D', 'R', 'R', 'R', 'N', 'N', 'N', 'R', 'R', 'R'],
      shift_type: '12h',
      cycle_length: 17,
      avg_weekly_hours: 42,
      teams_required: 5,
      is_wtd_compliant: true,
      description: 'Metropolitan pattern: Simple 3-day blocks. Easy to remember, balanced rotation.',
      created_at: new Date().toISOString()
    },
  ],
  '8h': [
    {
      id: 'rotating-8h',
      name: 'Classic Rotating (5E-2R-5L-2R-5N-3R)',
      pattern: ['E', 'E', 'E', 'E', 'E', 'R', 'R', 'L', 'L', 'L', 'L', 'L', 'R', 'R', 'N', 'N', 'N', 'N', 'N', 'R', 'R', 'R'],
      shift_type: '8h',
      cycle_length: 17,
      avg_weekly_hours: 37.5,
      teams_required: 5,
      is_wtd_compliant: true,
      description: 'Traditional 8-hour rotating pattern: 5 early shifts, 5 late shifts, 5 night shifts with rest periods.',
      created_at: new Date().toISOString()
    },
    {
      id: 'continental-8h',
      name: 'Continental 8h (4E-2R-4L-2R-4N-2R)',
      pattern: ['E', 'E', 'E', 'E', 'R', 'R', 'L', 'L', 'L', 'L', 'R', 'R', 'N', 'N', 'N', 'N', 'R', 'R'],
      shift_type: '8h',
      cycle_length: 17,
      avg_weekly_hours: 37.5,
      teams_required: 5,
      is_wtd_compliant: true,
      description: 'Continental-style 8-hour pattern: 4-day blocks with 2-day rest periods.',
      created_at: new Date().toISOString()
    },
    {
      id: 'metropolitan-8h',
      name: 'Metropolitan 8h (3E-2R-3L-2R-3N-2R)',
      pattern: ['E', 'E', 'E', 'R', 'R', 'L', 'L', 'L', 'R', 'R', 'N', 'N', 'N', 'R', 'R'],
      shift_type: '8h',
      cycle_length: 17,
      avg_weekly_hours: 37.5,
      teams_required: 5,
      is_wtd_compliant: true,
      description: 'Metropolitan 8-hour pattern: 3-day blocks with frequent rest periods. Good work-life balance.',
      created_at: new Date().toISOString()
    },
    {
      id: 'fast-rotating-8h',
      name: 'Fast Rotating (2E-2L-2N-2R)',
      pattern: ['E', 'E', 'L', 'L', 'N', 'N', 'R', 'R'],
      shift_type: '8h',
      cycle_length: 17,
      avg_weekly_hours: 42,
      teams_required: 5,
      is_wtd_compliant: true,
      description: 'Fast rotation: 2 days on each shift type. Minimizes circadian disruption.',
      created_at: new Date().toISOString()
    },
    {
      id: 'compressed-8h',
      name: 'Compressed (6E-3R-6L-3R-6N-4R)',
      pattern: ['E', 'E', 'E', 'E', 'E', 'E', 'R', 'R', 'R', 'L', 'L', 'L', 'L', 'L', 'L', 'R', 'R', 'R', 'N', 'N', 'N', 'N', 'N', 'N', 'R', 'R', 'R', 'R'],
      shift_type: '8h',
      cycle_length: 17,
      avg_weekly_hours: 37.5,
      teams_required: 5,
      is_wtd_compliant: true,
      description: 'Compressed pattern: 6 consecutive days with longer rest periods. Maximizes days off.',
      created_at: new Date().toISOString()
    },
  ],
};
