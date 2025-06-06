
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffSelector } from "@/components/leave/StaffSelector";
import { DateSelector } from "@/components/leave/DateSelector";
import { LeaveTypeSelector } from "@/components/leave/LeaveTypeSelector";
import { LeaveSummary } from "@/components/leave/LeaveSummary";
import { useStaffData } from "@/hooks/useStaffData";
import { calculateDaysBetween } from "@/utils/leaveCalculations";

interface StaffOption {
  id: string;
  first_name: string;
  last_name: string;
  leave_allowance_days?: number;
  leave_taken_monthly: Record<string, number>;
}

export default function ManageLeave() {
  const { staffList, loading, refetchStaffList } = useStaffData();
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState<"annual-leave" | "sick">("annual-leave");
  const [submitting, setSubmitting] = useState(false);

  // Set first staff member as selected when data loads
  useEffect(() => {
    if (staffList.length > 0 && !selectedStaff) {
      setSelectedStaff(staffList[0].id);
    }
  }, [staffList, selectedStaff]);

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
      
      // Get current user for requested_by field
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('Submitting leave request:', {
        staff_id: selectedStaff,
        start_date: startDate,
        end_date: endDate,
        leave_type: type,
        days_requested: daysRequested,
        requested_by: user?.id
      });

      const { error } = await supabase.from("leave_requests").insert({
        staff_id: selectedStaff,
        start_date: startDate,
        end_date: endDate,
        leave_type: type,
        days_requested: daysRequested,
        status: "pending",
        reason: `${type === "annual-leave" ? "Annual leave" : "Sick leave"} request`,
        requested_by: user?.id
      });

      if (error) {
        console.error('Error submitting leave request:', error);
        toast({ title: "Error submitting request", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Leave request submitted successfully" });
        setStartDate("");
        setEndDate("");
        // Refresh staff list to update leave counts
        refetchStaffList();
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
          <StaffSelector 
            staffList={staffList}
            selectedStaff={selectedStaff}
            onStaffChange={setSelectedStaff}
          />

          <DateSelector 
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />

          <LeaveTypeSelector 
            type={type}
            onTypeChange={setType}
          />

          <LeaveSummary 
            startDate={startDate}
            endDate={endDate}
            selectedStaffData={selectedStaffData}
            calculateDaysBetween={calculateDaysBetween}
          />

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
