
import { StaffMember } from '@/types/roster';

export interface StaffingRequirements {
  day_shift_staff: number;
  night_shift_staff: number;
  early_shift_staff?: number;
  late_shift_staff?: number;
}

export interface RosterConfig {
  /** Shift framework: '8h' for E/L/N shifts, '12h' for D/N shifts */
  shiftType: '8h' | '12h';
  operationalWindow: '16h' | '24h' | 'custom';
  customHours?: number;
  template: string;
  cycleLength: number;
  startDate: string;
  rosterName: string;
  staffingRequirements: StaffingRequirements;
}

export interface CustomPattern {
  id: string;
  name: string;
  pattern: string[];
  shift_type: '8h' | '12h';
  created_at: string;
}

export interface NewRosterWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onRosterGenerated: (tempConfigId?: string) => void;
  staffList: StaffMember[];
}

export interface WizardStepProps {
  config: RosterConfig;
  setConfig: React.Dispatch<React.SetStateAction<RosterConfig>>;
  staffList: StaffMember[];
}
