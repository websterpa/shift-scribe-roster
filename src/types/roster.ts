
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
