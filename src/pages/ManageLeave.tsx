
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
import { StaffMember } from "@/types/roster";

export default function ManageLeave() {
  console.log('🔄 ManageLeave component rendered');
  
  const { staffList, loading, refetchStaffList } = useStaffData();
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState<"annual-leave" | "sick">("annual-leave");
  const [submitting, setSubmitting] = useState(false);

  console.log('📊 ManageLeave state:', {
    staffCount: staffList.length,
    selectedStaff,
    startDate,
    endDate,
    type,
    loading,
    submitting
  });

  // Set first staff member as selected when data loads
  useEffect(() => {
    console.log('🔄 ManageLeave useEffect triggered', { staffListLength: staffList.length, selectedStaff });
    if (staffList.length > 0 && !selectedStaff) {
      console.log('✅ Setting first staff member as selected:', staffList[0].id);
      setSelectedStaff(staffList[0].id);
    }
  }, [staffList, selectedStaff]);

  const submitLeave = async () => {
    console.log('🚀 submitLeave called with:', {
      selectedStaff,
      startDate,
      endDate,
      type
    });

    if (!selectedStaff || !startDate || !endDate) {
      console.warn('⚠️ submitLeave validation failed - missing fields');
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      console.warn('⚠️ submitLeave validation failed - invalid date range');
      toast({ title: "Start date must be before or equal to end date", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    console.log('📤 Starting leave request submission...');

    try {
      const daysRequested = calculateDaysBetween(startDate, endDate);
      console.log('📊 Calculated days requested:', daysRequested);
      
      // Get current user for requested_by field
      console.log('👤 Getting current user...');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Current user:', user?.id);
      
      const leaveData = {
        staff_id: selectedStaff,
        start_date: startDate,
        end_date: endDate,
        leave_type: type,
        days_requested: daysRequested,
        status: "pending",
        reason: `${type === "annual-leave" ? "Annual leave" : "Sick leave"} request`,
        requested_by: user?.id
      };

      console.log('💾 Inserting leave request:', leaveData);

      const { error } = await supabase.from("leave_requests").insert(leaveData);

      if (error) {
        console.error('❌ Error submitting leave request:', error);
        toast({ title: "Error submitting request", description: error.message, variant: "destructive" });
      } else {
        console.log('✅ Leave request submitted successfully');
        toast({ title: "Leave request submitted successfully" });
        setStartDate("");
        setEndDate("");
        console.log('🔄 Refreshing staff list...');
        refetchStaffList();
      }
    } catch (error) {
      console.error('❌ Exception in submitLeave:', error);
      toast({ title: "Error submitting leave request", variant: "destructive" });
    } finally {
      console.log('🏁 submitLeave completed');
      setSubmitting(false);
    }
  };

  if (loading) {
    console.log('⏳ ManageLeave showing loading state');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading staff list...</div>
      </div>
    );
  }

  const selectedStaffData = staffList.find(s => s.id === selectedStaff);
  console.log('👤 Selected staff data:', selectedStaffData?.first_name, selectedStaffData?.last_name);

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
            onStaffChange={(staffId) => {
              console.log('👤 Staff selection changed to:', staffId);
              setSelectedStaff(staffId);
            }}
          />

          <DateSelector 
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(date) => {
              console.log('📅 Start date changed to:', date);
              setStartDate(date);
            }}
            onEndDateChange={(date) => {
              console.log('📅 End date changed to:', date);
              setEndDate(date);
            }}
          />

          <LeaveTypeSelector 
            type={type}
            onTypeChange={(newType) => {
              console.log('🏷️ Leave type changed to:', newType);
              setType(newType);
            }}
          />

          <LeaveSummary 
            startDate={startDate}
            endDate={endDate}
            selectedStaffData={selectedStaffData}
            calculateDaysBetween={calculateDaysBetween}
          />

          <Button 
            onClick={() => {
              console.log('🎯 Submit Leave Request button clicked');
              submitLeave();
            }}
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
