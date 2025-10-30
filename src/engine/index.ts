/**
 * Atlas Roster Engine - Main Entry Point
 * 
 * Exports all core engine functionality:
 * - Roster generation
 * - Diagnostics
 * - Validation
 * - Corrective analysis
 * - Export utilities
 */

// Core generation
export { 
  generateRosterWithChecks,
  type GenerateRosterInput,
  type RosterAssignment,
  type RosterWithChecks,
  type RosterDiagnostics
} from './generateRoster';

// Persistence
export {
  saveRoster,
  type RosterVersion
} from './persistRoster';

// Diagnostics
export {
  summariseDiagnostics,
  calculateOverallCompliance,
  type StaffDiagnostics,
  type PatternDefinition,
  type StaffPattern,
  type Assignment
} from './diagnostics';

// Validation
export {
  checkRestPeriods,
  checkWeeklyAverage,
  validateWTDCompliance,
  assignmentsToShiftRecords,
  type ShiftRecord,
  type RestViolation
} from './validators/wtd';

// Corrective analysis
export {
  generateCorrections,
  filterBySeverity,
  groupByStaff,
  type CorrectionSuggestion,
  type CorrectiveAnalysis
} from './corrective';

// Auto-apply corrective engine
export {
  autoApplyCorrections,
  hasCriticalCorrections,
  formatChangelog,
  type CorrectionChangeLog,
  type AutoApplyResult
} from './corrective/autoApply';

// AI Fairness Balancer
export {
  computeShiftScores,
  balanceRoster,
  getRebalancingCandidates,
  generateFairnessReport,
  type ShiftWeights,
  type StaffWorkloadScore,
  type FairnessAnalysis
} from './balancer/fairness';

// Export utilities
export {
  exportRosterCSV,
  exportRosterExcel,
  exportRosterPDF,
  type ExportableAssignment
} from './exports';
