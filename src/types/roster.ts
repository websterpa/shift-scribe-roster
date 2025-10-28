export interface ConfigItem {
  id: string;
  config_name: string;
  cycle_length_weeks: number;
  shift_type: "8h" | "12h";
  operational_hours_per_day: number;
  handshake_minutes: number;
  start_date: string;
  created_at?: string;
  // Add staffing requirements properties
  day_shift_staff?: number;
  night_shift_staff?: number;
  early_shift_staff?: number;
  late_shift_staff?: number;
}

// Updated StaffMember interface to include new availability tracking fields
export interface StaffMember {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  hire_date: string;
  is_active: boolean;
  availability_status: 'active' | 'temporarily_unavailable' | 'inactive';
  unavailability_reason?: string;
  unavailable_from?: string;
  expected_return_date?: string;
  unavailability_notes?: string;
  role?: string;
  eligible_shifts: string[];
  is_shift_worker: boolean;
  min_hours_per_week: number;
  max_hours_per_week: number;
  opted_out_wtd: boolean;
  days_off_per_week: number;
  hourly_rate: number;
  holiday_multiplier: number;
  leave_allowance_days: number;
  leave_taken_monthly?: Record<string, number>; // Added for leave management
  wtd_opt_out?: boolean; // WTD 48-hour opt-out flag
  // Computed field for backwards compatibility
  name?: string;
  preferences?: {
    preferred_shifts?: string[];
    avoid_shifts?: string[];
    preferred_days?: number[];
    avoid_days?: number[];
  };
  contract_hours?: number;
}

export interface Assignment {
  date: string;
  staff_id: string;
  shift_code: string;
  shift_start?: string | null;
  shift_end?: string | null;
  hours?: number;
  cost?: number;
  version_id?: string;
}

export interface RosterConfig {
  id: string;
  config_name: string;
  cycle_length_weeks: number;
  shift_type: string;
  operational_hours_per_day: number;
  handshake_minutes: number;
  start_date: string;
}

export interface LeaveEntry {
  date: string;
  type: string;
}

export interface WeekData {
  weekStart: Date;
  assignments: any[];
}
