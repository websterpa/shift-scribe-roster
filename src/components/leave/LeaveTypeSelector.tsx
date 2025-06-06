
import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface LeaveTypeSelectorProps {
  type: "annual-leave" | "sick";
  onTypeChange: (type: "annual-leave" | "sick") => void;
}

export function LeaveTypeSelector({ type, onTypeChange }: LeaveTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <Label>Leave Type</Label>
      <RadioGroup value={type} onValueChange={(value) => onTypeChange(value as "annual-leave" | "sick")}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="annual-leave" id="annual-leave" />
          <Label htmlFor="annual-leave">Annual Leave</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="sick" id="sick" />
          <Label htmlFor="sick">Sick Leave</Label>
        </div>
      </RadioGroup>
    </div>
  );
}
