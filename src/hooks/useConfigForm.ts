
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
    start_date: ''
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
      
      setFormData({
        config_name: data.config_name,
        cycle_length_weeks: data.cycle_length_weeks,
        shift_type: data.shift_type as '8h' | '12h',
        operational_hours_per_day: data.operational_hours_per_day,
        handshake_minutes: closestValid,
        start_date: data.start_date
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
