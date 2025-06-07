
import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StaffMember } from "@/types/roster";

interface StaffSelectorProps {
  staffList: StaffMember[];
  selectedStaff: string;
  onStaffChange: (staffId: string) => void;
}

export function StaffSelector({ staffList, selectedStaff, onStaffChange }: StaffSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="staff-select">Staff Member</Label>
      <Select value={selectedStaff} onValueChange={onStaffChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select staff member" />
        </SelectTrigger>
        <SelectContent>
          {staffList.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.first_name} {s.last_name} (Allowance: {s.leave_allowance_days || 25} days)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
