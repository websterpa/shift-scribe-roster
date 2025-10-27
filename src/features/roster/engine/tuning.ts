/**
 * Roster Engine Tuning Configuration
 * 
 * Centralized tuning parameters for fairness, rest, and distribution.
 * Values can be adjusted via UI and persisted to localStorage.
 */

export interface RosterTuning {
  // Fairness weights
  FAIRNESS_WEIGHT: number;           // Penalty for variance in total hours (0.2-0.4)
  NIGHT_BALANCE_WEIGHT: number;      // Additional weight for night shift balance (0.2-0.4)
  PREFERENCE_PENALTY: number;        // Penalty for violating soft preferences (0.1-0.2)
  DISTRIBUTION_PENALTY: number;      // Penalty when approaching distribution caps (0.3-0.8)
  
  // Rest constraints
  MIN_REST_HOURS: number;            // Minimum hours between shifts (8-12)
  MAX_CONSECUTIVE_DAYS: number;      // Maximum consecutive working days (5-7)
  MAX_CONSECUTIVE_NIGHTS: number;    // Maximum consecutive night shifts (2-4)
  
  // Distribution targets (per cycle/roster period)
  MAX_NIGHTS_PER_CYCLE: number;      // Maximum nights per staff (3-8)
  MAX_WEEKENDS_PER_CYCLE: number;    // Maximum weekend days per staff (2-6)
}

export const DEFAULT_TUNING: RosterTuning = {
  FAIRNESS_WEIGHT: 0.3,
  NIGHT_BALANCE_WEIGHT: 0.3,
  PREFERENCE_PENALTY: 0.15,
  DISTRIBUTION_PENALTY: 0.5,
  MIN_REST_HOURS: 11,
  MAX_CONSECUTIVE_DAYS: 6,
  MAX_CONSECUTIVE_NIGHTS: 3,
  MAX_NIGHTS_PER_CYCLE: 4,
  MAX_WEEKENDS_PER_CYCLE: 3,
};

const STORAGE_KEY = 'roster_tuning_config';

/**
 * Load tuning configuration from localStorage
 */
export function loadTuning(): RosterTuning {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_TUNING, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load tuning config:', error);
  }
  return DEFAULT_TUNING;
}

/**
 * Save tuning configuration to localStorage
 */
export function saveTuning(tuning: RosterTuning): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tuning));
    console.log('✓ Tuning configuration saved', tuning);
  } catch (error) {
    console.error('Failed to save tuning config:', error);
  }
}

/**
 * Reset tuning configuration to defaults
 */
export function resetTuning(): RosterTuning {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('✓ Tuning configuration reset to defaults');
  } catch (error) {
    console.error('Failed to reset tuning config:', error);
  }
  return DEFAULT_TUNING;
}

/**
 * Get current tuning (alias for loadTuning)
 */
export const TUNING = loadTuning();
