import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { saveConfig, updateConfig, fetchConfigById, ConfigData } from "@/utils/configHelpers";
import { toast } from "@/hooks/use-toast";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PatternSelector from "./PatternSelector";

interface Config {
  cycle_length_weeks: number;
  shift_type: "8h" | "12h";
  operational_hours_per_day: number;
  handshake_minutes: number;
  start_date: string;
  pattern?: string[];
}

interface Props {
  onSaveConfig: (config: Config & { id?: string }) => void;
  defaultCycle?: number;
  defaultShift?: "8h" | "12h";
  defaultOpsHours?: number;
  defaultHandshake?: number;
}

export default function RosterSettings({
  onSaveConfig,
  defaultCycle = 8,
  defaultShift = "8h",
  defaultOpsHours = 16,
  defaultHandshake = 0
}: Props) {
  console.log('🔄 RosterSettings component rendered');
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const configId = searchParams.get('configId');
  
  const [configName, setConfigName] = useState("");
  const [cycle, setCycle] = useState(defaultCycle);
  const [shiftType, setShiftType] = useState(defaultShift);
  const [opsHours, setOpsHours] = useState(defaultOpsHours);
  const [handshakeMinutes, setHandshakeMinutes] = useState<0 | 15 | 30 | 45 | 60>(defaultHandshake as 0 | 15 | 30 | 45 | 60);
  const [startDate, setStartDate] = useState(() => {
    // First Monday today or next
    const d = new Date();
    const diff = (8 - d.getDay()) % 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split("T")[0];
  });
  
  // Pattern selector states
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [customPattern, setCustomPattern] = useState<string[]>([]);
  const [patternArray, setPatternArray] = useState<string[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    console.log('🔄 RosterSettings useEffect triggered', { configId });
    if (configId) {
      loadConfiguration(configId);
    }
  }, [configId]);

  const loadConfiguration = async (id: string) => {
    try {
      console.log('📥 RosterSettings: Loading configuration:', id);
      setIsLoading(true);
      setValidationErrors({});
      const config = await fetchConfigById(id);
      
      console.log('✅ RosterSettings: Configuration loaded:', config);
      setConfigName(config.config_name || "");
      setCycle(config.cycle_length_weeks || defaultCycle);
      setShiftType((config.shift_type as "8h" | "12h") || defaultShift);
      setOpsHours(config.operational_hours_per_day || defaultOpsHours);
      
      // Ensure handshake minutes is a valid value (0, 15, 30, 45, 60)
      const validHandshake = config.handshake_minutes || 0;
      const allowedValues: (0 | 15 | 30 | 45 | 60)[] = [0, 15, 30, 45, 60];
      const closestValid = allowedValues.includes(validHandshake as any) 
        ? validHandshake as 0 | 15 | 30 | 45 | 60
        : 0;
      setHandshakeMinutes(closestValid);
      console.log('🤝 RosterSettings: Handshake minutes set to:', closestValid);
      
      setStartDate(config.start_date || startDate);
      
      // Load pattern data - safely cast Json[] to string[]
      if (config.pattern && Array.isArray(config.pattern)) {
        console.log('🎨 RosterSettings: Loading saved pattern:', config.pattern);
        // Ensure all values are strings
        const stringPattern = config.pattern.filter((item): item is string => typeof item === 'string');
        setPatternArray(stringPattern);
      }
      
      toast({
        title: "Configuration loaded",
        description: `Loaded configuration: ${config.config_name}`,
      });
    } catch (error) {
      console.error('❌ RosterSettings: Error loading configuration:', error);
      toast({
        title: "Error loading configuration",
        description: "Failed to load the selected configuration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    console.log('🔍 RosterSettings: Validating form');
    const errors: Record<string, string> = {};

    if (!configName.trim()) {
      errors.configName = "Configuration name is required";
    }

    if (cycle < 1 || cycle > 52) {
      errors.cycle = "Cycle length must be between 1 and 52 weeks";
    }

    if (opsHours < 8 || opsHours > 24) {
      errors.opsHours = "Operational hours must be between 8 and 24";
    }

    if (!startDate) {
      errors.startDate = "Start date is required";
    } else {
      const selectedDate = new Date(startDate);
      const dayOfWeek = selectedDate.getDay();
      if (dayOfWeek !== 1) { // Monday = 1
        errors.startDate = "Start date must be a Monday";
      }
    }

    setValidationErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    console.log('✅ RosterSettings: Form validation result:', { isValid, errors });
    return isValid;
  };

  const handleSave = async () => {
    console.log('💾 RosterSettings: Save button clicked', { 
      configName, cycle, shiftType, opsHours, handshakeMinutes, startDate, patternArray 
    });
    
    if (!validateForm()) {
      console.warn('⚠️ RosterSettings: Form validation failed');
      toast({
        title: "Validation Error",
        description: "Please fix the errors before saving",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      console.log('📤 RosterSettings: Submitting configuration...');
      
      const configData: ConfigData = {
        configName: configName.trim(),
        cycle_length_weeks: cycle,
        shift_type: shiftType,
        operational_hours_per_day: opsHours,
        handshake_minutes: handshakeMinutes,
        start_date: startDate
      };

      let savedConfigId: string;

      if (configId) {
        console.log('🔄 RosterSettings: Updating existing configuration');
        // Update existing configuration
        await updateConfig(configId, {
          config_name: configData.configName,
          cycle_length_weeks: configData.cycle_length_weeks,
          shift_type: configData.shift_type,
          operational_hours_per_day: configData.operational_hours_per_day,
          handshake_minutes: configData.handshake_minutes,
          start_date: configData.start_date,
          pattern: patternArray
        });
        savedConfigId = configId;
        
        toast({
          title: "Configuration updated",
          description: `Successfully updated: ${configData.configName}`,
        });
      } else {
        console.log('➕ RosterSettings: Creating new configuration');
        // Save new configuration
        savedConfigId = await saveConfig({
          ...configData,
          pattern: patternArray
        });
        
        toast({
          title: "Configuration saved",
          description: `Successfully saved: ${configData.configName}`,
        });
      }

      console.log('✅ RosterSettings: Configuration saved with ID:', savedConfigId);

      // Call the parent callback
      onSaveConfig({
        id: savedConfigId,
        cycle_length_weeks: cycle,
        shift_type: shiftType,
        operational_hours_per_day: opsHours,
        handshake_minutes: handshakeMinutes,
        start_date: startDate,
        pattern: patternArray
      });

    } catch (error) {
      console.error('❌ RosterSettings: Error saving configuration:', error);
      toast({
        title: "Save failed",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!configId) return;

    console.log('🗑️ RosterSettings: Deleting configuration:', configId);

    try {
      setIsDeleting(true);
      
      const { error } = await supabase
        .from("roster_config")
        .delete()
        .eq("id", configId);
        
      if (error) {
        console.error('❌ RosterSettings: Error deleting configuration:', error);
        throw error;
      }
      
      console.log('✅ RosterSettings: Configuration deleted successfully');
      toast({
        title: "Configuration deleted",
        description: "Configuration has been permanently deleted",
      });
      
      navigate('/my-configurations');
    } catch (error) {
      console.error('❌ RosterSettings: Exception deleting configuration:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePatternHandoverChange = (minutes: number) => {
    console.log('🤝 RosterSettings: Pattern handover changed:', minutes);
    setHandshakeMinutes(minutes as 0 | 15 | 30 | 45 | 60);
  };

  if (isLoading) {
    console.log('⏳ RosterSettings: Showing loading state');
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Loading configuration...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {configId ? 'Edit Configuration' : 'Roster Settings'}
            </CardTitle>
            {configId && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this configuration? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="configName">Configuration Name:</Label>
            <Input
              id="configName"
              type="text"
              value={configName}
              onChange={(e) => {
                console.log('📝 RosterSettings: Config name changed:', e.target.value);
                setConfigName(e.target.value);
              }}
              placeholder="e.g. Summer 2025 Cycle"
              className={validationErrors.configName ? "border-red-500" : ""}
            />
            {validationErrors.configName && (
              <p className="text-sm text-red-500">{validationErrors.configName}</p>
            )}
            <p className="text-xs text-muted-foreground">Give this configuration a memorable name</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cycle">Averaging Period (weeks):</Label>
            <Input
              id="cycle"
              type="number"
              min={1}
              max={52}
              step={1}
              value={cycle}
              onChange={(e) => {
                const value = Number(e.target.value);
                console.log('📊 RosterSettings: Cycle changed:', value);
                setCycle(value);
              }}
              className={validationErrors.cycle ? "border-red-500" : ""}
            />
            {validationErrors.cycle && (
              <p className="text-sm text-red-500">{validationErrors.cycle}</p>
            )}
            <p className="text-xs text-muted-foreground">4, 8, 17 weeks or custom</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="opsHours">Operational Hours/Day:</Label>
            <Input
              id="opsHours"
              type="number"
              min={8}
              max={24}
              step={1}
              value={opsHours}
              onChange={(e) => {
                const value = Number(e.target.value);
                console.log('🕐 RosterSettings: Operational hours changed:', value);
                setOpsHours(value);
              }}
              className={validationErrors.opsHours ? "border-red-500" : ""}
            />
            {validationErrors.opsHours && (
              <p className="text-sm text-red-500">{validationErrors.opsHours}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Handover Time:</Label>
            <Select 
              value={handshakeMinutes.toString()} 
              onValueChange={(value) => {
                const numValue = Number(value) as 0 | 15 | 30 | 45 | 60;
                console.log('🤝 RosterSettings: Handshake minutes changed:', numValue);
                setHandshakeMinutes(numValue);
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
            <Label htmlFor="startDate">Cycle Start Date (Monday):</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => {
                console.log('📅 RosterSettings: Start date changed:', e.target.value);
                setStartDate(e.target.value);
              }}
              className={validationErrors.startDate ? "border-red-500" : ""}
            />
            {validationErrors.startDate && (
              <p className="text-sm text-red-500">{validationErrors.startDate}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pattern Selector */}
      <PatternSelector
        shiftLength={shiftType}
        onShiftLengthChange={setShiftType}
        selectedTemplate={selectedTemplate}
        onTemplateChange={setSelectedTemplate}
        customPattern={customPattern}
        onCustomPatternChange={setCustomPattern}
        patternArray={patternArray}
        onPatternArrayChange={setPatternArray}
        handoverMinutes={handshakeMinutes}
        onHandoverChange={handlePatternHandoverChange}
      />

      {/* Save Button */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            onClick={handleSave} 
            className="w-full"
            disabled={isSaving}
          >
            {isSaving ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {configId ? 'Updating...' : 'Saving...'}
              </div>
            ) : (
              configId ? 'Update Configuration' : 'Save Configuration'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
