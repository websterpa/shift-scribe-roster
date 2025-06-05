
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StaffOption {
  id: string;
  first_name: string;
  last_name: string;
  leave_allowance_days?: number;
  leave_taken_monthly: Record<string, number>;
}

export default function ManageLeave() {
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState<"annual-leave" | "sick">("annual-leave");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStaffList();
  }, []);

  const fetchStaffList = async () => {
    try {
      console.log('Fetching staff list...');
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("id, first_name, last_name")
        .eq("is_active", true);

      if (error) {
        console.error('Error fetching staff:', error);
        toast({ title: "Error fetching staff", description: error.message, variant: "destructive" });
        return;
      }

      console.log('Staff data:', data);

      const enriched = await Promise.all(
        data?.map(async (s) => {
          // Count monthly leave requests for this staff member
          const { data: leaveData } = await supabase
            .from("leave_requests")
            .select("start_date, leave_type")
            .eq("staff_id", s.id)
            .eq("status", "approved");

          const monthlyCounts: Record<string, number> = {};
          leaveData?.forEach((lr: any) => {
            const monthKey = lr.start_date.slice(0, 7); // "YYYY-MM"
            monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
          });

          return { 
            ...s, 
            leave_taken_monthly: monthlyCounts,
            leave_allowance_days: 25 // Default allowance, could be stored in staff_profiles
          };
        }) || []
      );

      setStaffList(enriched);
      if (enriched.length > 0) {
        setSelectedStaff(enriched[0].id);
      }
    } catch (error) {
      console.error('Error in fetchStaffList:', error);
      toast({ title: "Error loading staff", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysBetween = (start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // Include both start and end dates
  };

  const submitLeave = async () => {
    if (!selectedStaff || !startDate || !endDate) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({ title: "Start date must be before or equal to end date", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      const daysRequested = calculateDaysBetween(startDate, endDate);
      
      console.log('Submitting leave request:', {
        staff_id: selectedStaff,
        start_date: startDate,
        end_date: endDate,
        leave_type: type,
        days_requested: daysRequested
      });

      const { error } = await supabase.from("leave_requests").insert({
        staff_id: selectedStaff,
        start_date: startDate,
        end_date: endDate,
        leave_type: type,
        days_requested: daysRequested,
        status: "pending",
        reason: `${type === "annual-leave" ? "Annual leave" : "Sick leave"} request`
      });

      if (error) {
        console.error('Error submitting leave request:', error);
        toast({ title: "Error submitting request", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Leave request submitted successfully" });
        setStartDate("");
        setEndDate("");
        // Refresh staff list to update leave counts
        fetchStaffList();
      }
    } catch (error) {
      console.error('Error in submitLeave:', error);
      toast({ title: "Error submitting leave request", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading staff list...</div>
      </div>
    );
  }

  const selectedStaffData = staffList.find(s => s.id === selectedStaff);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Manage Leave</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-select">Staff Member</Label>
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
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

          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
            />
          </div>

          <div className="space-y-3">
            <Label>Leave Type</Label>
            <RadioGroup value={type} onValueChange={(value) => setType(value as "annual-leave" | "sick")}>
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

          {startDate && endDate && (
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                Days requested: {calculateDaysBetween(startDate, endDate)}
              </p>
              {selectedStaffData && (
                <p className="text-sm text-gray-600">
                  Current month leave taken: {selectedStaffData.leave_taken_monthly[new Date().toISOString().slice(0, 7)] || 0} days
                </p>
              )}
            </div>
          )}

          <Button 
            onClick={submitLeave} 
            className="w-full"
            disabled={submitting || !selectedStaff || !startDate || !endDate}
          >
            {submitting ? "Submitting..." : "Submit Leave Request"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
