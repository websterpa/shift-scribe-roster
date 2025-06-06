
export interface ConfigItem {
  id: string;
  config_name: string;
  cycle_length_weeks: number;
  shift_type: "8h" | "12h";
  operational_hours_per_day: number;
  handshake_minutes: number;
  start_date: string;
  created_at?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  eligible_shifts: string[];
  is_shift_worker: boolean;
  min_hours_per_week: number;
  max_hours_per_week: number;
  opted_out_wtd: boolean;
  days_off_per_week: number;
  hourly_rate: number;
  holiday_multiplier: number;
  leave_allowance_days: number;
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
