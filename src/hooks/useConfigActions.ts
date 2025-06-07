
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ConfigFormData } from './useConfigForm';

export function useConfigActions() {
  console.log('🔄 useConfigActions hook initialized');
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const configId = searchParams.get('configId');
  const action = searchParams.get('action');
  const [saving, setSaving] = useState(false);

  const saveConfig = async (formData: ConfigFormData) => {
    console.log('💾 useConfigActions: Saving config:', formData);
    
    if (!formData.config_name.trim()) {
      console.warn('⚠️ useConfigActions: Config name is required');
      toast({
        title: "Configuration name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.start_date) {
      console.warn('⚠️ useConfigActions: Start date is required');
      toast({
        title: "Start date is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      console.log('📤 useConfigActions: Submitting config to database...');

      if (configId) {
        console.log('🔄 useConfigActions: Updating existing config');
        const { error } = await supabase
          .from('roster_config')
          .update(formData)
          .eq('id', configId);

        if (error) {
          console.error('❌ useConfigActions: Error updating config:', error);
          throw error;
        }
        console.log('✅ useConfigActions: Config updated successfully');
        toast({ title: "Configuration updated successfully" });
      } else {
        console.log('➕ useConfigActions: Creating new config');
        const { data, error } = await supabase
          .from('roster_config')
          .insert(formData)
          .select()
          .single();

        if (error) {
          console.error('❌ useConfigActions: Error creating config:', error);
          throw error;
        }
        console.log('✅ useConfigActions: Config created successfully:', data.id);
        toast({ title: "Configuration saved successfully" });

        if (action === 'generate') {
          console.log('🚀 useConfigActions: Redirecting to generate roster...');
          navigate(`/generate-roster?configId=${data.id}`);
          return;
        }
      }

      navigate('/my-configurations');
    } catch (error: any) {
      console.error('❌ useConfigActions: Exception saving config:', error);
      toast({
        title: "Error saving configuration",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateRoster = (formData: ConfigFormData) => {
    console.log('🚀 useConfigActions: Generate Roster button clicked');
    if (configId) {
      navigate(`/generate-roster?configId=${configId}`);
    } else {
      console.log('💾 useConfigActions: Saving config first, then generating roster...');
      saveConfig(formData);
    }
  };

  return {
    saving,
    saveConfig,
    handleGenerateRoster
  };
}
