
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Config {
  cycle_length_weeks: number;
  shift_type: "8h" | "12h";
  operational_hours_per_day: number;
  handshake_minutes: number;
  start_date: string;
}

interface Props {
  onSaveConfig: (config: Config) => void;
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

  const handleSave = () => {
    onSaveConfig({
      cycle_length_weeks: cycle,
      shift_type: shiftType,
      operational_hours_per_day: opsHours,
      handshake_minutes: handshake,
      start_date: startDate
    });
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Roster Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <Button onClick={handleSave} className="w-full">
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  );
}
