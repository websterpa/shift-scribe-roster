
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveConfig, updateConfig, fetchConfigById, ConfigData } from "@/utils/configHelpers";
import { toast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";

interface Config {
  cycle_length_weeks: number;
  shift_type: "8h" | "12h";
  operational_hours_per_day: number;
  handshake_minutes: number;
  start_date: string;
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
  const [searchParams] = useSearchParams();
  const configId = searchParams.get('configId');
  
  const [configName, setConfigName] = useState("");
  const [cycle, setCycle] = useState(defaultCycle);
  const [shiftType, setShiftType] = useState(defaultShift);
  const [opsHours, setOpsHours] = useState(defaultOpsHours);
  const [handshake, setHandshake] = useState(defaultHandshake);
  const [startDate, setStartDate] = useState(() => {
    // First Monday today or next
    const d = new Date();
    const diff = (8 - d.getDay()) % 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split("T")[0];
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (configId) {
      loadConfiguration(configId);
    }
  }, [configId]);

  const loadConfiguration = async (id: string) => {
    try {
      setIsLoading(true);
      const config = await fetchConfigById(id);
      
      setConfigName(config.config_name);
      setCycle(config.cycle_length_weeks);
      setShiftType(config.shift_type as "8h" | "12h");
      setOpsHours(config.operational_hours_per_day);
      setHandshake(config.handshake_minutes);
      setStartDate(config.start_date);
      
      toast({
        title: "Configuration loaded",
        description: `Loaded configuration: ${config.config_name}`,
      });
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast({
        title: "Error loading configuration",
        description: "Failed to load the selected configuration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!configName.trim()) {
      toast({
        title: "Configuration name required",
        description: "Please enter a name for this configuration",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      
      const configData: ConfigData = {
        configName: configName.trim(),
        cycle_length_weeks: cycle,
        shift_type: shiftType,
        operational_hours_per_day: opsHours,
        handshake_minutes: handshake,
        start_date: startDate
      };

      let savedConfigId: string;

      if (configId) {
        // Update existing configuration
        await updateConfig(configId, {
          config_name: configData.configName,
          cycle_length_weeks: configData.cycle_length_weeks,
          shift_type: configData.shift_type,
          operational_hours_per_day: configData.operational_hours_per_day,
          handshake_minutes: configData.handshake_minutes,
          start_date: configData.start_date
        });
        savedConfigId = configId;
        
        toast({
          title: "Configuration updated",
          description: `Successfully updated: ${configData.configName}`,
        });
      } else {
        // Save new configuration
        savedConfigId = await saveConfig(configData);
        
        toast({
          title: "Configuration saved",
          description: `Successfully saved: ${configData.configName}`,
        });
      }

      // Call the parent callback
      onSaveConfig({
        id: savedConfigId,
        cycle_length_weeks: cycle,
        shift_type: shiftType,
        operational_hours_per_day: opsHours,
        handshake_minutes: handshake,
        start_date: startDate
      });

    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Save failed",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="max-w-md mx-auto">
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
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {configId ? 'Edit Configuration' : 'Roster Settings'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="configName">Configuration Name:</Label>
          <Input
            id="configName"
            type="text"
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            placeholder="e.g. Summer 2025 Cycle"
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">Give this configuration a memorable name</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cycle">Averaging Period (weeks):</Label>
          <Input
            id="cycle"
            type="number"
            min={4}
            max={52}
            step={1}
            value={cycle}
            onChange={(e) => setCycle(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">8 or 17 or custom</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="shiftType">Shift Type:</Label>
          <Select value={shiftType} onValueChange={(value: "8h" | "12h") => setShiftType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="8h">8‐Hour Shifts</SelectItem>
              <SelectItem value="12h">12‐Hour Shifts</SelectItem>
            </SelectContent>
          </Select>
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
            onChange={(e) => setOpsHours(Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="handshake">Handover (minutes):</Label>
          <Input
            id="handshake"
            type="number"
            min={0}
            max={15}
            step={15}
            value={handshake}
            onChange={(e) => setHandshake(Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate">Cycle Start Date (Monday):</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

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
  );
}
