
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
      
      setFormData({
        config_name: data.config_name,
        cycle_length_weeks: data.cycle_length_weeks,
        shift_type: data.shift_type as '8h' | '12h',
        operational_hours_per_day: data.operational_hours_per_day,
        handshake_minutes: closestValid,
        start_date: data.start_date,
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
