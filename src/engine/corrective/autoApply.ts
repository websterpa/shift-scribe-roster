/**
 * Auto-Apply Corrective Engine
 * 
 * Automatically applies safe corrective suggestions during roster generation
 * with full audit trail for compliance reporting.
 */

import { generateCorrections, type CorrectionSuggestion, type CorrectiveAnalysis } from './index';
import type { RosterAssignment, RosterDiagnostics } from '@/engine/generateRoster';
import { createLogger } from '@/utils/errorLogger';

const logger = createLogger('AutoApplyCorrections');

export interface CorrectionChangeLog {
  staffId: string;
  staffName: string;
  dayIndex: number;
  date: string;
  oldShift: string;
  newShift: string;
  reason: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface AutoApplyResult {
  roster: RosterAssignment[];
  changelog: CorrectionChangeLog[];
  suggestionsApplied: number;
  suggestionsSkipped: number;
}

/**
 * Automatically apply safe corrective suggestions to roster
 * 
 * Only applies "rest period" corrections automatically.
 * Pattern drift and weekly average issues require manual review.
 * 
 * @param roster - Original roster assignments
 * @param diagnostics - Current roster diagnostics
 * @returns Updated roster with changelog
 */
export function autoApplyCorrections(
  roster: RosterAssignment[],
  diagnostics: RosterDiagnostics
): AutoApplyResult {
  logger.info('[autoApplyCorrections] Starting automatic correction application');
  
  const corrections: CorrectiveAnalysis = generateCorrections(roster, diagnostics);
  const changelog: CorrectionChangeLog[] = [];
  let appliedCount = 0;
  let skippedCount = 0;

  // Create a mutable copy of roster
  const updatedRoster = [...roster];

  for (const suggestion of corrections.suggestions) {
    // Only auto-apply rest violations (critical and warning severity)
    const isRestViolation = suggestion.issue.toLowerCase().includes('rest') ||
                           suggestion.issue.toLowerCase().includes('11h');
    
    if (isRestViolation && (suggestion.severity === 'critical' || suggestion.severity === 'warning')) {
      logger.info('[autoApplyCorrections] Applying rest violation fix', {
        staffId: suggestion.staffId,
        dayIndex: suggestion.dayIndex,
        issue: suggestion.issue
      });

      // Find the assignment to update
      const assignmentIndex = updatedRoster.findIndex(
        r => r.staffId === suggestion.staffId && r.dayIndex === suggestion.dayIndex
      );

      if (assignmentIndex >= 0) {
        const oldAssignment = updatedRoster[assignmentIndex];
        
        // Insert rest day by converting shift to 'R'
        const updatedAssignment: RosterAssignment = {
          ...oldAssignment,
          shift: 'R'
        };

        changelog.push({
          staffId: suggestion.staffId,
          staffName: suggestion.staffName,
          dayIndex: suggestion.dayIndex,
          date: oldAssignment.date.toISOString().split('T')[0],
          oldShift: oldAssignment.shift,
          newShift: 'R',
          reason: suggestion.issue,
          severity: suggestion.severity
        });

        updatedRoster[assignmentIndex] = updatedAssignment;
        appliedCount++;
        
        logger.info('[autoApplyCorrections] Applied correction', {
          staffId: suggestion.staffId,
          oldShift: oldAssignment.shift,
          newShift: 'R'
        });
      } else {
        logger.warn('[autoApplyCorrections] Assignment not found for suggestion', {
          staffId: suggestion.staffId,
          dayIndex: suggestion.dayIndex
        });
        skippedCount++;
      }
    } else {
      // Skip pattern drift and weekly average issues - require manual review
      logger.info('[autoApplyCorrections] Skipping suggestion (requires manual review)', {
        staffId: suggestion.staffId,
        issue: suggestion.issue,
        severity: suggestion.severity
      });
      skippedCount++;
    }
  }

  logger.info('[autoApplyCorrections] Automatic correction complete', {
    totalSuggestions: corrections.suggestions.length,
    applied: appliedCount,
    skipped: skippedCount
  });

  return {
    roster: updatedRoster,
    changelog,
    suggestionsApplied: appliedCount,
    suggestionsSkipped: skippedCount
  };
}

/**
 * Check if any critical corrections were applied
 */
export function hasCriticalCorrections(changelog: CorrectionChangeLog[]): boolean {
  return changelog.some(c => c.severity === 'critical');
}

/**
 * Format changelog for display or audit logging
 */
export function formatChangelog(changelog: CorrectionChangeLog[]): string {
  if (changelog.length === 0) {
    return 'No automatic corrections applied';
  }

  const lines = [
    `Automatic Corrections Applied: ${changelog.length}`,
    '─'.repeat(50),
    ...changelog.map(c => 
      `${c.date} | ${c.staffName} | ${c.oldShift} → ${c.newShift} | ${c.reason}`
    )
  ];

  return lines.join('\n');
}
