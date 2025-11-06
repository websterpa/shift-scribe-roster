export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      archived_rosters: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          assignments: Json
          created_at: string | null
          id: string
          month: string
          reason: string | null
          tenant_id: string | null
          version_id: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          assignments: Json
          created_at?: string | null
          id?: string
          month: string
          reason?: string | null
          tenant_id?: string | null
          version_id?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          assignments?: Json
          created_at?: string | null
          id?: string
          month?: string
          reason?: string | null
          tenant_id?: string | null
          version_id?: string | null
        }
        Relationships: []
      }
      correction_audit: {
        Row: {
          applied_at: string
          created_at: string
          id: string
          new_shift: string
          old_shift: string
          reason: string
          severity: string
          shift_date: string
          staff_id: string | null
          tenant_id: string
          version_id: string
        }
        Insert: {
          applied_at?: string
          created_at?: string
          id?: string
          new_shift: string
          old_shift: string
          reason: string
          severity: string
          shift_date: string
          staff_id?: string | null
          tenant_id: string
          version_id: string
        }
        Update: {
          applied_at?: string
          created_at?: string
          id?: string
          new_shift?: string
          old_shift?: string
          reason?: string
          severity?: string
          shift_date?: string
          staff_id?: string | null
          tenant_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "correction_audit_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correction_audit_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "roster_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_patterns: {
        Row: {
          avg_weekly_hours: number | null
          created_at: string
          crews_required: number | null
          description: string | null
          id: string
          is_wtd_compliant: boolean | null
          name: string
          pattern: string[]
          shift_type: string
          user_id: string
        }
        Insert: {
          avg_weekly_hours?: number | null
          created_at?: string
          crews_required?: number | null
          description?: string | null
          id?: string
          is_wtd_compliant?: boolean | null
          name: string
          pattern: string[]
          shift_type: string
          user_id: string
        }
        Update: {
          avg_weekly_hours?: number | null
          created_at?: string
          crews_required?: number | null
          description?: string | null
          id?: string
          is_wtd_compliant?: boolean | null
          name?: string
          pattern?: string[]
          shift_type?: string
          user_id?: string
        }
        Relationships: []
      }
      feasibility_scenarios: {
        Row: {
          avg_rolling: number | null
          avg_weekly_hours: number | null
          buffer_percent: number
          created_at: string | null
          id: string
          is_wtd_compliant: boolean | null
          max_rolling: number | null
          name: string
          pattern_id: string | null
          pattern_name: string | null
          recommendations: Json | null
          required_shifts_per_day: number
          required_staff: number | null
          shift_length: number
          staff_count: number | null
          total_breaches: number | null
          updated_at: string | null
          user_id: string
          utilization_pct: number | null
        }
        Insert: {
          avg_rolling?: number | null
          avg_weekly_hours?: number | null
          buffer_percent: number
          created_at?: string | null
          id?: string
          is_wtd_compliant?: boolean | null
          max_rolling?: number | null
          name: string
          pattern_id?: string | null
          pattern_name?: string | null
          recommendations?: Json | null
          required_shifts_per_day?: number
          required_staff?: number | null
          shift_length: number
          staff_count?: number | null
          total_breaches?: number | null
          updated_at?: string | null
          user_id: string
          utilization_pct?: number | null
        }
        Update: {
          avg_rolling?: number | null
          avg_weekly_hours?: number | null
          buffer_percent?: number
          created_at?: string | null
          id?: string
          is_wtd_compliant?: boolean | null
          max_rolling?: number | null
          name?: string
          pattern_id?: string | null
          pattern_name?: string | null
          recommendations?: Json | null
          required_shifts_per_day?: number
          required_staff?: number | null
          shift_length?: number
          staff_count?: number | null
          total_breaches?: number | null
          updated_at?: string | null
          user_id?: string
          utilization_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feasibility_scenarios_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "patterns_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feasibility_scenarios_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "site_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          comments: string | null
          created_at: string
          days_requested: number
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          requested_by: string | null
          staff_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          comments?: string | null
          created_at?: string
          days_requested: number
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          requested_by?: string | null
          staff_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          comments?: string | null
          created_at?: string
          days_requested?: number
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          requested_by?: string | null
          staff_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          payment_date: string
          payment_id: string
          payment_method: string
          payment_status: string
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          payment_date?: string
          payment_id: string
          payment_method: string
          payment_status: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_date?: string
          payment_id?: string
          payment_method?: string
          payment_status?: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_admin: boolean
          privacy_accepted: boolean
          privacy_accepted_at: string | null
          terms_accepted: boolean
          terms_accepted_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_admin?: boolean
          privacy_accepted?: boolean
          privacy_accepted_at?: string | null
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean
          privacy_accepted?: boolean
          privacy_accepted_at?: string | null
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      roster_assignments: {
        Row: {
          cost: number | null
          created_at: string | null
          date: string
          hours: number | null
          id: string
          shift_code: string
          shift_end: string | null
          shift_start: string | null
          staff_id: string
          tenant_id: string
          version_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          date: string
          hours?: number | null
          id?: string
          shift_code: string
          shift_end?: string | null
          shift_start?: string | null
          staff_id: string
          tenant_id: string
          version_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          date?: string
          hours?: number | null
          id?: string
          shift_code?: string
          shift_end?: string | null
          shift_start?: string | null
          staff_id?: string
          tenant_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_assignments_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "roster_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_config: {
        Row: {
          config_name: string
          created_at: string | null
          cycle_index: number | null
          cycle_length_weeks: number
          default_ot_hours: number | null
          default_ot_start_local_time: string | null
          handshake_minutes: number | null
          id: string
          operational_hours_per_day: number
          pattern: Json | null
          pattern_locked: boolean | null
          required_shifts: string[] | null
          requirements_v2: Json | null
          shift_type: string
          site_start_time: string | null
          staffing_requirements: Json | null
          standard_contract_hours: number
          start_date: string
          tenant_id: string
          timezone: string | null
        }
        Insert: {
          config_name: string
          created_at?: string | null
          cycle_index?: number | null
          cycle_length_weeks: number
          default_ot_hours?: number | null
          default_ot_start_local_time?: string | null
          handshake_minutes?: number | null
          id?: string
          operational_hours_per_day: number
          pattern?: Json | null
          pattern_locked?: boolean | null
          required_shifts?: string[] | null
          requirements_v2?: Json | null
          shift_type: string
          site_start_time?: string | null
          staffing_requirements?: Json | null
          standard_contract_hours?: number
          start_date: string
          tenant_id?: string
          timezone?: string | null
        }
        Update: {
          config_name?: string
          created_at?: string | null
          cycle_index?: number | null
          cycle_length_weeks?: number
          default_ot_hours?: number | null
          default_ot_start_local_time?: string | null
          handshake_minutes?: number | null
          id?: string
          operational_hours_per_day?: number
          pattern?: Json | null
          pattern_locked?: boolean | null
          required_shifts?: string[] | null
          requirements_v2?: Json | null
          shift_type?: string
          site_start_time?: string | null
          staffing_requirements?: Json | null
          standard_contract_hours?: number
          start_date?: string
          tenant_id?: string
          timezone?: string | null
        }
        Relationships: []
      }
      roster_versions: {
        Row: {
          config_id: string
          feasibility_snapshot: Json | null
          generated_at: string | null
          id: string
          label: string | null
          tenant_id: string
          version_name: string | null
          version_number: number
        }
        Insert: {
          config_id: string
          feasibility_snapshot?: Json | null
          generated_at?: string | null
          id?: string
          label?: string | null
          tenant_id: string
          version_name?: string | null
          version_number: number
        }
        Update: {
          config_id?: string
          feasibility_snapshot?: Json | null
          generated_at?: string | null
          id?: string
          label?: string | null
          tenant_id?: string
          version_name?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "roster_versions_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "roster_config"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          template_data: Json
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          template_data: Json
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          template_data?: Json
        }
        Relationships: []
      }
      shift_configurations: {
        Row: {
          created_at: string
          id: string
          name: string
          operational_hours: number
          shifts_per_day: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          operational_hours?: number
          shifts_per_day?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          operational_hours?: number
          shifts_per_day?: number
        }
        Relationships: []
      }
      site_patterns: {
        Row: {
          avg_weekly_hours: number | null
          created_at: string
          created_by: string
          cycle_length: number
          description: string | null
          id: string
          is_wtd_compliant: boolean | null
          name: string
          sequence: Json
          site_id: string
          system: string
          teams_required: number | null
          tenant_id: string
        }
        Insert: {
          avg_weekly_hours?: number | null
          created_at?: string
          created_by: string
          cycle_length?: number
          description?: string | null
          id?: string
          is_wtd_compliant?: boolean | null
          name: string
          sequence: Json
          site_id: string
          system: string
          teams_required?: number | null
          tenant_id: string
        }
        Update: {
          avg_weekly_hours?: number | null
          created_at?: string
          created_by?: string
          cycle_length?: number
          description?: string | null
          id?: string
          is_wtd_compliant?: boolean | null
          name?: string
          sequence?: Json
          site_id?: string
          system?: string
          teams_required?: number | null
          tenant_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          allow_supervisor_nights: boolean
          avg_staff_rate: number
          avg_supervisor_rate: number
          budget_warn_threshold: number | null
          created_at: string
          id: string
          role_mix_by_shift: Json | null
          updated_at: string
        }
        Insert: {
          allow_supervisor_nights?: boolean
          avg_staff_rate?: number
          avg_supervisor_rate?: number
          budget_warn_threshold?: number | null
          created_at?: string
          id?: string
          role_mix_by_shift?: Json | null
          updated_at?: string
        }
        Update: {
          allow_supervisor_nights?: boolean
          avg_staff_rate?: number
          avg_supervisor_rate?: number
          budget_warn_threshold?: number | null
          created_at?: string
          id?: string
          role_mix_by_shift?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      staff_counts: {
        Row: {
          count: number
          created_at: string
          id: string
          role_id: string | null
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          role_id?: string | null
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_counts_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          availability_status: string
          certifications: Json | null
          created_at: string
          days_off_per_week: number | null
          eligible_shifts: string[] | null
          email: string
          employee_id: string
          expected_return_date: string | null
          first_name: string
          hire_date: string
          holiday_multiplier: number | null
          hourly_rate: number | null
          id: string
          is_active: boolean
          is_admin: boolean
          is_shift_worker: boolean | null
          last_name: string
          leave_allowance_days: number | null
          max_hours_per_week: number | null
          min_hours_per_week: number | null
          name: string | null
          opted_out_wtd: boolean
          pattern_id: string | null
          pattern_offset: number | null
          phone: string | null
          role: string | null
          role_id: string | null
          shift_preferences: Json | null
          unavailability_notes: string | null
          unavailability_reason: string | null
          unavailable_from: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_status?: string
          certifications?: Json | null
          created_at?: string
          days_off_per_week?: number | null
          eligible_shifts?: string[] | null
          email: string
          employee_id: string
          expected_return_date?: string | null
          first_name: string
          hire_date: string
          holiday_multiplier?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          is_admin?: boolean
          is_shift_worker?: boolean | null
          last_name: string
          leave_allowance_days?: number | null
          max_hours_per_week?: number | null
          min_hours_per_week?: number | null
          name?: string | null
          opted_out_wtd?: boolean
          pattern_id?: string | null
          pattern_offset?: number | null
          phone?: string | null
          role?: string | null
          role_id?: string | null
          shift_preferences?: Json | null
          unavailability_notes?: string | null
          unavailability_reason?: string | null
          unavailable_from?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_status?: string
          certifications?: Json | null
          created_at?: string
          days_off_per_week?: number | null
          eligible_shifts?: string[] | null
          email?: string
          employee_id?: string
          expected_return_date?: string | null
          first_name?: string
          hire_date?: string
          holiday_multiplier?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          is_admin?: boolean
          is_shift_worker?: boolean | null
          last_name?: string
          leave_allowance_days?: number | null
          max_hours_per_week?: number | null
          min_hours_per_week?: number | null
          name?: string | null
          opted_out_wtd?: boolean
          pattern_id?: string | null
          pattern_offset?: number | null
          phone?: string | null
          role?: string | null
          role_id?: string | null
          shift_preferences?: Json | null
          unavailability_notes?: string | null
          unavailability_reason?: string | null
          unavailable_from?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "patterns_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profiles_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "site_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_paid: number | null
          created_at: string
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          paypal_subscription_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_method: string | null
          subscription_start_date: string | null
          subscription_status: string
          subscription_tier: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          paypal_subscription_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_method?: string | null
          subscription_start_date?: string | null
          subscription_status: string
          subscription_tier: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_paid?: number | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          paypal_subscription_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_method?: string | null
          subscription_start_date?: string | null
          subscription_status?: string
          subscription_tier?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tester_accounts: {
        Row: {
          created_at: string
          pin: string
          user_id: string
        }
        Insert: {
          created_at?: string
          pin: string
          user_id: string
        }
        Update: {
          created_at?: string
          pin?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      patterns_legacy: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          name: string | null
          site_id: string | null
          tokens: string | null
        }
        Insert: {
          created_at?: string | null
          description?: never
          id?: string | null
          name?: string | null
          site_id?: string | null
          tokens?: never
        }
        Update: {
          created_at?: string | null
          description?: never
          id?: string | null
          name?: string | null
          site_id?: string | null
          tokens?: never
        }
        Relationships: []
      }
    }
    Functions: {
      _hours_for_shift: { Args: { token: string }; Returns: number }
      get_admin_status: { Args: { check_user_id?: string }; Returns: boolean }
      get_user_admin_status: {
        Args: { check_user_id?: string }
        Returns: boolean
      }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { user_id?: string }; Returns: boolean }
      rpc_night_gap: { Args: { version_id: string }; Returns: Json }
      rpc_requirements_token_counts: {
        Args: { version_id: string }
        Returns: {
          cnt: number
          token: string
        }[]
      }
      rpc_roster_budget: { Args: { version_id: string }; Returns: Json }
      rpc_roster_kpis: { Args: { version_id: string }; Returns: Json }
      rpc_roster_staffing_matrix: {
        Args: { version_id: string }
        Returns: Json[]
      }
      rpc_roster_tours: { Args: { version_id: string }; Returns: Json[] }
      rpc_version_token_counts: {
        Args: { version_id: string }
        Returns: {
          cnt: number
          token: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
