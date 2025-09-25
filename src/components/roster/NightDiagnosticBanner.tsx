import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface NightDiagnosticProps {
  requirementsCount: number;
  assignmentsCount: number;
  hasUI: boolean;
  loading?: boolean;
}

export function NightDiagnosticBanner({ 
  requirementsCount, 
  assignmentsCount, 
  hasUI,
  loading = false 
}: NightDiagnosticProps) {
  if (loading) return null;
  
  const requiresNights = requirementsCount > 0;
  const hasAssignments = assignmentsCount > 0;
  
  // Case 1: Requirements N>0 but Assignments N=0 → generator is broken
  if (requiresNights && !hasAssignments) {
    return (
      <Alert className="border-red-200 bg-red-50 mb-4">
        <XCircle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-900">Generator Issue Detected</AlertTitle>
        <AlertDescription className="text-red-800">
          Configuration requires {requirementsCount} Night shifts per cycle, but generator produced 0 Night assignments. 
          Check pattern compatibility, coverage targets, or constraint violations (rest windows, supervisor rules).
        </AlertDescription>
      </Alert>
    );
  }
  
  // Case 2: Assignments N>0 but UI shows none → anchoring/UI mapping bug  
  if (hasAssignments && !hasUI) {
    return (
      <Alert className="border-orange-200 bg-orange-50 mb-4">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-900">UI Mapping Issue</AlertTitle>
        <AlertDescription className="text-orange-800">
          Generator created {assignmentsCount} Night assignments, but they're not displaying in the UI. 
          This indicates a shift anchoring or token mapping problem.
        </AlertDescription>
      </Alert>
    );
  }
  
  // Case 3: All working correctly
  if (requiresNights && hasAssignments && hasUI) {
    return (
      <Alert className="border-green-200 bg-green-50 mb-4">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900">Night Shifts Working Correctly</AlertTitle>
        <AlertDescription className="text-green-800">
          Configuration requires {requirementsCount} Nights, generator produced {assignmentsCount} assignments, 
          and UI is displaying them properly.
        </AlertDescription>
      </Alert>
    );
  }
  
  return null;
}