
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Save, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const RosterConfig = () => {
  console.log('🔄 RosterConfig component rendered');
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const configId = searchParams.get('configId');
  const action = searchParams.get('action');
  
  console.log('📊 RosterConfig params:', { configId, action });

  const [formData, setFormData] = useState({
    config_name: '',
    cycle_length_weeks: 4,
    shift_type: '8h' as '8h' | '12h',
    operational_hours_per_day: 24,
    handshake_minutes: 0 as 0 | 15 | 30 | 45 | 60,
    start_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('🔄 RosterConfig useEffect triggered', { configId });
    if (configId) {
      loadConfig(configId);
    } else {
      // Set default start date to next Monday
      const nextMonday = getNextMonday();
      console.log('📅 Setting default start date to next Monday:', nextMonday);
      setFormData(prev => ({ ...prev, start_date: nextMonday }));
    }
  }, [configId]);

  const getNextMonday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split('T')[0];
  };

  const loadConfig = async (id: string) => {
    console.log('📥 RosterConfig: Loading config:', id);
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('roster_config')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ RosterConfig: Error loading config:', error);
        toast({
          title: "Error loading configuration",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ RosterConfig: Config loaded:', data);
      
      // Ensure handshake minutes is a valid value
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
      console.error('❌ RosterConfig: Exception loading config:', error);
      toast({
        title: "Error loading configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    console.log('💾 RosterConfig: Saving config:', formData);
    
    if (!formData.config_name.trim()) {
      console.warn('⚠️ RosterConfig: Config name is required');
      toast({
        title: "Configuration name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.start_date) {
      console.warn('⚠️ RosterConfig: Start date is required');
      toast({
        title: "Start date is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      console.log('📤 RosterConfig: Submitting config to database...');

      if (configId) {
        console.log('🔄 RosterConfig: Updating existing config');
        // Update existing config
        const { error } = await supabase
          .from('roster_config')
          .update(formData)
          .eq('id', configId);

        if (error) {
          console.error('❌ RosterConfig: Error updating config:', error);
          throw error;
        }
        console.log('✅ RosterConfig: Config updated successfully');
        toast({ title: "Configuration updated successfully" });
      } else {
        console.log('➕ RosterConfig: Creating new config');
        // Create new config
        const { data, error } = await supabase
          .from('roster_config')
          .insert(formData)
          .select()
          .single();

        if (error) {
          console.error('❌ RosterConfig: Error creating config:', error);
          throw error;
        }
        console.log('✅ RosterConfig: Config created successfully:', data.id);
        toast({ title: "Configuration saved successfully" });

        // If action is generate, redirect to generate roster with this config
        if (action === 'generate') {
          console.log('🚀 RosterConfig: Redirecting to generate roster...');
          navigate(`/generate-roster?configId=${data.id}`);
          return;
        }
      }

      // Redirect to configurations list
      navigate('/my-configurations');
    } catch (error: any) {
      console.error('❌ RosterConfig: Exception saving config:', error);
      toast({
        title: "Error saving configuration",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateRoster = () => {
    console.log('🚀 RosterConfig: Generate Roster button clicked');
    if (configId) {
      navigate(`/generate-roster?configId=${configId}`);
    } else {
      console.log('💾 RosterConfig: Saving config first, then generating roster...');
      // Save first, then redirect to generate
      setFormData(prev => ({ ...prev }));
      // This will trigger a save with action=generate
      saveConfig();
    }
  };

  if (loading) {
    console.log('⏳ RosterConfig: Showing loading state');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          {configId ? 'Edit Configuration' : 'Create Roster Configuration'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Configuration Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="config_name">Configuration Name</Label>
              <Input
                id="config_name"
                value={formData.config_name}
                onChange={(e) => {
                  console.log('📝 RosterConfig: Config name changed:', e.target.value);
                  setFormData(prev => ({ ...prev, config_name: e.target.value }));
                }}
                placeholder="e.g. CCTV Control Room Standard"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cycle_length">Cycle Length (weeks)</Label>
              <Select 
                value={formData.cycle_length_weeks.toString()} 
                onValueChange={(value) => {
                  console.log('📊 RosterConfig: Cycle length changed:', value);
                  setFormData(prev => ({ ...prev, cycle_length_weeks: parseInt(value) }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 weeks</SelectItem>
                  <SelectItem value="4">4 weeks</SelectItem>
                  <SelectItem value="6">6 weeks</SelectItem>
                  <SelectItem value="8">8 weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shift_type">Shift Type</Label>
              <Select 
                value={formData.shift_type} 
                onValueChange={(value: '8h' | '12h') => {
                  console.log('⏰ RosterConfig: Shift type changed:', value);
                  setFormData(prev => ({ ...prev, shift_type: value }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8h">8 Hour Shifts</SelectItem>
                  <SelectItem value="12h">12 Hour Shifts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="operational_hours">Operational Hours per Day</Label>
              <Input
                id="operational_hours"
                type="number"
                value={formData.operational_hours_per_day}
                onChange={(e) => {
                  console.log('🕐 RosterConfig: Operational hours changed:', e.target.value);
                  setFormData(prev => ({ ...prev, operational_hours_per_day: parseInt(e.target.value) || 24 }));
                }}
                min="1"
                max="24"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="handshake_minutes">Handover Time</Label>
              <Select 
                value={formData.handshake_minutes.toString()} 
                onValueChange={(value) => {
                  const numValue = Number(value) as 0 | 15 | 30 | 45 | 60;
                  console.log('🤝 RosterConfig: Handshake minutes changed:', numValue);
                  setFormData(prev => ({ ...prev, handshake_minutes: numValue }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No handover (0 minutes)</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Time for shift handover between operators</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => {
                  console.log('📅 RosterConfig: Start date changed:', e.target.value);
                  setFormData(prev => ({ ...prev, start_date: e.target.value }));
                }}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={() => {
                  console.log('💾 RosterConfig: Save Config button clicked');
                  saveConfig();
                }}
                disabled={saving}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : (configId ? 'Update Configuration' : 'Save Configuration')}
              </Button>

              <Button 
                onClick={handleGenerateRoster}
                disabled={saving}
                variant="outline"
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate Roster
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuration Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
              <div><strong>Name:</strong> {formData.config_name || 'Unnamed Configuration'}</div>
              <div><strong>Cycle:</strong> {formData.cycle_length_weeks} weeks</div>
              <div><strong>Shifts:</strong> {formData.shift_type}</div>
              <div><strong>Daily Hours:</strong> {formData.operational_hours_per_day} hours</div>
              <div><strong>Handover:</strong> {formData.handshake_minutes} minutes</div>
              <div><strong>Start Date:</strong> {formData.start_date || 'Not set'}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RosterConfig;
