/**
 * Corrective Engine - Analyzes roster diagnostics and suggests improvements
 * 
 * Reads diagnostics output and generates actionable suggestions for:
 * - Rest period violations
 * - Pattern compliance drift
 * - Shift realignments
 */

import type { RosterAssignment, RosterDiagnostics } from '@/engine/generateRoster';
import { createLogger } from '@/utils/errorLogger';

const logger = createLogger('CorrectiveEngine');

export interface CorrectionSuggestion {
  staffId: string;
  staffName: string;
  dayIndex: number;
  issue: string;
  suggestion: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface CorrectiveAnalysis {
  suggestions: CorrectionSuggestion[];
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
}

/**
 * Generate corrective suggestions from roster diagnostics
 */
export function generateCorrections(
  roster: RosterAssignment[],
  diagnostics: RosterDiagnostics
): CorrectiveAnalysis {
  logger.info('[generateCorrections] Analyzing roster for corrective suggestions');
  
  const suggestions: CorrectionSuggestion[] = [];

  // 1. Handle rest violations
  for (const [staffId, violations] of Object.entries(diagnostics.restViolations)) {
    const staffRoster = roster.filter(r => r.staffId === staffId).sort((a, b) => a.dayIndex - b.dayIndex);
    const staffName = staffRoster[0]?.staffName || staffId;

    for (const violation of violations) {
      const dayIndex = staffRoster.findIndex(r => r.date.toISOString().split('T')[0] === violation.day);
      
      if (dayIndex > 0) {
        const prevShift = staffRoster[dayIndex - 1];
        const currentShift = staffRoster[dayIndex];

        suggestions.push({
          staffId,
          staffName,
          dayIndex,
          issue: `Insufficient rest (${violation.gap.toFixed(1)}h between shifts)`,
          suggestion: `Insert 'R' (rest day) between ${prevShift.shift} on ${prevShift.date.toISOString().split('T')[0]} and ${currentShift.shift} on ${currentShift.date.toISOString().split('T')[0]}`,
          severity: violation.gap < 8 ? 'critical' : 'warning'
        });
      }
    }
  }

  // 2. Handle pattern drift
  for (const staffDiag of diagnostics.staffSummary) {
    if (staffDiag.patternCompliance < 90) {
      const staffRoster = roster.filter(r => r.staffId === staffDiag.staffId);
      const staffName = staffRoster[0]?.staffName || staffDiag.staffId;

      suggestions.push({
        staffId: staffDiag.staffId,
        staffName,
        dayIndex: 0,
        issue: `Pattern compliance at ${staffDiag.patternCompliance.toFixed(1)}%`,
        suggestion: 'Re-sync pattern offset or review assignment sequence to match expected pattern',
        severity: staffDiag.patternCompliance < 70 ? 'critical' : 'warning'
      });
    }
  }

  // 3. Handle weekly average non-compliance
  for (const [staffId, isCompliant] of Object.entries(diagnostics.weeklyAverageCompliant)) {
    if (!isCompliant) {
      const avgHours = diagnostics.avgHoursPerWeek[staffId] || 0;
      const staffRoster = roster.filter(r => r.staffId === staffId);
      const staffName = staffRoster[0]?.staffName || staffId;

      suggestions.push({
        staffId,
        staffName,
        dayIndex: 0,
        issue: `Weekly average ${avgHours.toFixed(1)}h exceeds 48h limit`,
        suggestion: 'Redistribute shifts to reduce weekly average or verify opt-out status',
        severity: avgHours > 56 ? 'critical' : 'warning'
      });
    }
  }

  const criticalIssues = suggestions.filter(s => s.severity === 'critical').length;
  const warningIssues = suggestions.filter(s => s.severity === 'warning').length;

  logger.info('[generateCorrections] Analysis complete', {
    totalSuggestions: suggestions.length,
    critical: criticalIssues,
    warnings: warningIssues
  });

  return {
    suggestions: suggestions.sort((a, b) => {
      // Sort by severity: critical > warning > info
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    totalIssues: suggestions.length,
    criticalIssues,
    warningIssues
  };
}

/**
 * Filter suggestions by severity level
 */
export function filterBySeverity(
  analysis: CorrectiveAnalysis,
  severity: 'critical' | 'warning' | 'info'
): CorrectionSuggestion[] {
  return analysis.suggestions.filter(s => s.severity === severity);
}

/**
 * Group suggestions by staff member
 */
export function groupByStaff(
  analysis: CorrectiveAnalysis
): Record<string, CorrectionSuggestion[]> {
  return analysis.suggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.staffId]) {
      acc[suggestion.staffId] = [];
    }
    acc[suggestion.staffId].push(suggestion);
    return acc;
  }, {} as Record<string, CorrectionSuggestion[]>);
}
