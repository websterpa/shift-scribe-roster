/**
 * Roster Export Utilities
 * Handles CSV and PDF export for generated rosters
 */

import { utils, writeFile } from 'xlsx';
import type { RosterAssignment } from '@/engine/generateRoster';

export interface ExportableAssignment {
  staffId: string;
  staffName: string;
  date: string;
  shift: string;
  hours?: number;
  cost?: number;
}

/**
 * Export roster to CSV format
 */
export function exportRosterCSV(roster: RosterAssignment[], filename = 'roster.csv'): void {
  console.log('[exportRosterCSV] Exporting roster to CSV', { count: roster.length });

  if (roster.length === 0) {
    console.warn('[exportRosterCSV] No data to export');
    return;
  }

  // Transform data for CSV
  const exportData: ExportableAssignment[] = roster.map(assignment => ({
    staffId: assignment.staffId,
    staffName: assignment.staffName,
    date: assignment.date.toISOString().split('T')[0],
    shift: assignment.shift,
    hours: assignment.hours,
    cost: assignment.cost
  }));

  // Create worksheet and workbook
  const ws = utils.json_to_sheet(exportData);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Roster');

  // Trigger download
  writeFile(wb, filename);
  
  console.log('[exportRosterCSV] CSV export complete');
}

/**
 * Export roster to Excel format with formatting
 */
export function exportRosterExcel(roster: RosterAssignment[], filename = 'roster.xlsx'): void {
  console.log('[exportRosterExcel] Exporting roster to Excel', { count: roster.length });

  if (roster.length === 0) {
    console.warn('[exportRosterExcel] No data to export');
    return;
  }

  // Transform data
  const exportData = roster.map(assignment => ({
    'Staff ID': assignment.staffId,
    'Staff Name': assignment.staffName,
    'Date': assignment.date.toISOString().split('T')[0],
    'Shift': assignment.shift,
    'Hours': assignment.hours || 8,
    'Cost': assignment.cost ? `£${assignment.cost.toFixed(2)}` : 'N/A'
  }));

  // Create worksheet and workbook
  const ws = utils.json_to_sheet(exportData);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // Staff ID
    { wch: 20 }, // Staff Name
    { wch: 12 }, // Date
    { wch: 8 },  // Shift
    { wch: 8 },  // Hours
    { wch: 10 }  // Cost
  ];

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Roster');

  // Trigger download
  writeFile(wb, filename);
  
  console.log('[exportRosterExcel] Excel export complete');
}

/**
 * Export roster to PDF format (basic text-based)
 */
export function exportRosterPDF(roster: RosterAssignment[], filename = 'roster.pdf'): void {
  console.log('[exportRosterPDF] Exporting roster to PDF', { count: roster.length });

  if (roster.length === 0) {
    console.warn('[exportRosterPDF] No data to export');
    return;
  }

  // Group by staff for better readability
  const staffGroups = roster.reduce((acc, assignment) => {
    if (!acc[assignment.staffId]) {
      acc[assignment.staffId] = {
        name: assignment.staffName,
        assignments: []
      };
    }
    acc[assignment.staffId].assignments.push(assignment);
    return acc;
  }, {} as Record<string, { name: string; assignments: RosterAssignment[] }>);

  // Create HTML content for printing
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Roster Export</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .header-info { margin-bottom: 20px; }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header-info">
        <h1>Staff Roster</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Total Assignments:</strong> ${roster.length}</p>
      </div>
      
      ${Object.entries(staffGroups).map(([staffId, group]) => `
        <h2>${group.name}</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Shift</th>
              <th>Hours</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            ${group.assignments
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .map(a => `
                <tr>
                  <td>${a.date.toISOString().split('T')[0]}</td>
                  <td>${a.shift}</td>
                  <td>${a.hours || 8}</td>
                  <td>${a.cost ? `£${a.cost.toFixed(2)}` : 'N/A'}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      `).join('')}
      
      <div class="no-print" style="margin-top: 40px;">
        <button onclick="window.print()">Print / Save as PDF</button>
        <button onclick="window.close()">Close</button>
      </div>
    </body>
    </html>
  `;

  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    console.log('[exportRosterPDF] PDF preview opened');
  } else {
    console.error('[exportRosterPDF] Failed to open print window - popup blocked?');
  }
}
