
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { RotateCcw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const ResetDataButton = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const handleResetData = async () => {
    setIsResetting(true);
    console.log('Starting data reset...');

    try {
      // Clear data in the correct order to respect foreign key constraints
      console.log('Clearing table: roster_assignments');
      const { error: error1 } = await supabase
        .from('roster_assignments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error1) throw error1;

      console.log('Clearing table: roster_versions');
      const { error: error2 } = await supabase
        .from('roster_versions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error2) throw error2;

      console.log('Clearing table: leave_requests');
      const { error: error3 } = await supabase
        .from('leave_requests')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error3) throw error3;

      console.log('Clearing table: staff_profiles');
      const { error: error4 } = await supabase
        .from('staff_profiles')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error4) throw error4;

      console.log('Clearing table: roster_config');
      const { error: error5 } = await supabase
        .from('roster_config')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error5) throw error5;

      console.log('Clearing table: roles');
      const { error: error6 } = await supabase
        .from('roles')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error6) throw error6;

      console.log('Clearing table: staff_counts');
      const { error: error7 } = await supabase
        .from('staff_counts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error7) throw error7;

      console.log('Clearing table: schedule_templates');
      const { error: error8 } = await supabase
        .from('schedule_templates')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error8) throw error8;

      console.log('Clearing table: shift_configurations');
      const { error: error9 } = await supabase
        .from('shift_configurations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error9) throw error9;

      console.log('Clearing table: admin_settings');
      const { error: error10 } = await supabase
        .from('admin_settings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error10) throw error10;

      console.log('Data reset completed successfully');
      toast({
        title: "Data Reset Complete",
        description: "All settings and data have been cleared. You can now start fresh.",
      });

      // Refresh the page to reflect the changes
      window.location.reload();
    } catch (error) {
      console.error('Error resetting data:', error);
      toast({
        title: "Reset Failed",
        description: "There was an error clearing the data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
      setConfirmationOpen(false);
    }
  };

  return (
    <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive" 
          className="flex items-center gap-2"
          disabled={isResetting}
        >
          {isResetting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          Reset All Settings
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>This action cannot be undone. This will permanently delete:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>All staff profiles and data</li>
              <li>All roster assignments and configurations</li>
              <li>All leave requests</li>
              <li>All admin settings</li>
              <li>All schedule templates</li>
            </ul>
            <p className="font-semibold text-red-600">
              You will need to reconfigure everything from scratch.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleResetData}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            disabled={isResetting}
          >
            {isResetting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Resetting...
              </>
            ) : (
              'Yes, reset everything'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
