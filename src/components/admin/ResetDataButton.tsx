
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
import { toast } from '@/components/ui/use-toast';

export const ResetDataButton = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const handleResetData = async () => {
    setIsResetting(true);
    console.log('Starting data reset...');

    try {
      // Clear data in the correct order to respect foreign key constraints
      const tablesToClear = [
        'roster_assignments',
        'roster_versions', 
        'leave_requests',
        'staff_profiles',
        'roster_config',
        'roles',
        'staff_counts',
        'schedule_templates',
        'shift_configurations',
        'admin_settings'
      ];

      for (const table of tablesToClear) {
        console.log(`Clearing table: ${table}`);
        const { error } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
        
        if (error) {
          console.error(`Error clearing ${table}:`, error);
          throw error;
        }
      }

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
