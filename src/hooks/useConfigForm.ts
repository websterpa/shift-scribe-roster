
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchConfigById } from '@/utils/configHelpers';
import { toast } from '@/hooks/use-toast';

export interface ConfigFormData {
  config_name: string;
  cycle_length_weeks: number;
  shift_type: '8h' | '12h';
  operational_hours_per_day: number;
  handshake_minutes: 0 | 15 | 30 | 45 | 60;
  start_date: string;
  site_start_time: string;
  timezone: string;
  default_ot_hours?: number;
  default_ot_start_local_time?: string;
  pattern?: string[];
  patternLocked?: boolean; // If true, use pattern-based roster generation
  required_shifts?: string[]; // Auto-set based on shift_type: ['E','L','N'] for 8h, ['D','N'] for 12h
  staffing_requirements?: {
    day_shift_staff?: number;
    night_shift_staff?: number;
    early_shift_staff?: number;
    late_shift_staff?: number;
  };
}

export function useConfigForm() {
  console.log('🔄 useConfigForm hook initialized');
  
  const [searchParams] = useSearchParams();
  const configId = searchParams.get('configId');
  
  const [formData, setFormData] = useState<ConfigFormData>({
    config_name: '',
    cycle_length_weeks: 4,
    shift_type: '8h',
    operational_hours_per_day: 24,
    handshake_minutes: 0,
    start_date: '',
    site_start_time: '07:00',
    timezone: 'Europe/London',
    default_ot_hours: 4,
    default_ot_start_local_time: '10:00',
    pattern: [],
    patternLocked: true, // Default to pattern-based generation
    required_shifts: ['E', 'L', 'N'], // Default to 8h shifts
    staffing_requirements: {
      day_shift_staff: 2,
      night_shift_staff: 2,
      early_shift_staff: 1,
      late_shift_staff: 1
    }
  });
  const [loading, setLoading] = useState(false);

  const getNextMonday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split('T')[0];
  };

  useEffect(() => {
    console.log('🔄 useConfigForm useEffect triggered', { configId });
    if (configId) {
      loadConfig(configId);
    } else {
      const nextMonday = getNextMonday();
      console.log('📅 Setting default start date to next Monday:', nextMonday);
      setFormData(prev => ({ ...prev, start_date: nextMonday }));
    }
  }, [configId]);

  const loadConfig = async (id: string) => {
    console.log('📥 useConfigForm: Loading config:', id);
    try {
      setLoading(true);
      const data = await fetchConfigById(id);
      console.log('✅ useConfigForm: Config loaded:', data);
      
      const validHandshake = data.handshake_minutes || 0;
      const allowedValues: (0 | 15 | 30 | 45 | 60)[] = [0, 15, 30, 45, 60];
      const closestValid = allowedValues.includes(validHandshake as any) 
        ? validHandshake as 0 | 15 | 30 | 45 | 60
        : 0;
      
      // Safely parse staffing_requirements from JSON
      let staffingRequirements = {
        day_shift_staff: 2,
        night_shift_staff: 2,
        early_shift_staff: 1,
        late_shift_staff: 1
      };
      
      if (data.staffing_requirements && typeof data.staffing_requirements === 'object') {
        const parsed = data.staffing_requirements as any;
        staffingRequirements = {
          day_shift_staff: parsed.day_shift_staff || 2,
          night_shift_staff: parsed.night_shift_staff || 2,
          early_shift_staff: parsed.early_shift_staff || 1,
          late_shift_staff: parsed.late_shift_staff || 1
        };
      }

      // Safely parse pattern data from JSON
      let pattern: string[] = [];
      if (data.pattern && Array.isArray(data.pattern)) {
        pattern = data.pattern.filter((item): item is string => typeof item === 'string');
      }
      
      // Parse required_shifts from database or derive from shift_type
      let requiredShifts: string[] = [];
      if (data.required_shifts && Array.isArray(data.required_shifts)) {
        requiredShifts = data.required_shifts.filter((item): item is string => typeof item === 'string');
      } else {
        // Auto-derive from shift_type if not present in DB
        requiredShifts = data.shift_type === '12h' ? ['D', 'N'] : ['E', 'L', 'N'];
      }
      
      setFormData({
        config_name: data.config_name,
        cycle_length_weeks: data.cycle_length_weeks,
        shift_type: data.shift_type as '8h' | '12h',
        operational_hours_per_day: data.operational_hours_per_day,
        handshake_minutes: closestValid,
        start_date: data.start_date,
        site_start_time: data.site_start_time || '07:00',
        timezone: data.timezone || 'Europe/London',
        default_ot_hours: data.default_ot_hours || undefined,
        default_ot_start_local_time: data.default_ot_start_local_time || undefined,
        pattern: pattern,
        patternLocked: true, // Default to pattern-based generation
        required_shifts: requiredShifts,
        staffing_requirements: staffingRequirements
      });
    } catch (error) {
      console.error('❌ useConfigForm: Exception loading config:', error);
      toast({
        title: "Error loading configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    configId,
    formData,
    setFormData,
    loading
  };
}
