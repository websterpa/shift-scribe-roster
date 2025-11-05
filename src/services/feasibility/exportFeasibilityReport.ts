import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportData {
  patternName: string;
  cycleLength: number;
  weeklyHours: number;
  requiredStaff: number;
  activeDays: number;
  restDays: number;
  bufferPercent: number;
  standardContractHours: number;
  availableHoursPerWeek: number;
  overtimeGapPerWeek: number;
  fteRequired: number;
  fteAvailable: number;
  wtd: {
    restOk: boolean;
    avgOk: boolean;
  };
  staffCount: number;
  shiftLength: number;
}

export async function exportToPDF(data: ExportData, chartElement: HTMLElement | null) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // Header
  pdf.setFontSize(20);
  pdf.text('Feasibility Report', pageWidth / 2, 20, { align: 'center' });
  
  // Pattern Details
  pdf.setFontSize(14);
  pdf.text('Pattern Configuration', 20, 40);
  
  pdf.setFontSize(10);
  let y = 50;
  pdf.text(`Pattern: ${data.patternName}`, 20, y);
  y += 7;
  pdf.text(`Cycle Length: ${data.cycleLength} days`, 20, y);
  y += 7;
  pdf.text(`Active Days: ${data.activeDays} | Rest Days: ${data.restDays}`, 20, y);
  y += 7;
  pdf.text(`Shift Length: ${data.shiftLength} hours`, 20, y);
  y += 10;
  
  // Feasibility Results
  pdf.setFontSize(14);
  pdf.text('Feasibility Results', 20, y);
  y += 10;
  
  pdf.setFontSize(10);
  pdf.text(`Weekly Hours: ${data.weeklyHours.toFixed(1)} h`, 20, y);
  y += 7;
  pdf.text(`Required Staff: ${data.requiredStaff}`, 20, y);
  y += 7;
  pdf.text(`Current Staff Count: ${data.staffCount}`, 20, y);
  y += 7;
  pdf.text(`Buffer Percentage: ${data.bufferPercent}%`, 20, y);
  y += 7;
  pdf.text(`Standard Contract Hours: ${data.standardContractHours} h/week`, 20, y);
  y += 7;
  pdf.text(`Available Hours/Week: ${data.availableHoursPerWeek.toFixed(1)} h`, 20, y);
  y += 7;
  pdf.text(`Overtime Gap/Week: ${data.overtimeGapPerWeek.toFixed(1)} h`, 20, y);
  y += 7;
  pdf.text(`FTE Required: ${data.fteRequired.toFixed(2)}`, 20, y);
  y += 7;
  pdf.text(`FTE Available: ${data.fteAvailable.toFixed(2)}`, 20, y);
  y += 10;
  
  // WTD Compliance
  pdf.setFontSize(14);
  pdf.text('WTD Compliance', 20, y);
  y += 10;
  
  pdf.setFontSize(10);
  pdf.setTextColor(data.wtd.restOk ? 0 : 255, data.wtd.restOk ? 128 : 0, 0);
  pdf.text(`11h Rest Period: ${data.wtd.restOk ? '✓ Compliant' : '✗ Non-Compliant'}`, 20, y);
  y += 7;
  
  pdf.setTextColor(data.wtd.avgOk ? 0 : 255, data.wtd.avgOk ? 128 : 0, 0);
  pdf.text(`48h Weekly Average: ${data.wtd.avgOk ? '✓ Compliant' : '✗ Non-Compliant'}`, 20, y);
  pdf.setTextColor(0, 0, 0);
  y += 15;
  
  // Chart
  if (chartElement) {
    try {
      const canvas = await html2canvas(chartElement, { 
        scale: 2,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      if (y + imgHeight > pdf.internal.pageSize.getHeight() - 20) {
        pdf.addPage();
        y = 20;
      }
      
      pdf.addImage(imgData, 'PNG', 20, y, imgWidth, imgHeight);
    } catch (error) {
      console.error('Error capturing chart:', error);
    }
  }
  
  // Footer
  const timestamp = new Date().toLocaleString();
  pdf.setFontSize(8);
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Generated: ${timestamp}`, pageWidth / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
  
  pdf.save(`feasibility-report-${data.patternName.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
}

export function exportToCSV(data: ExportData) {
  const rows = [
    ['Feasibility Report', ''],
    ['Generated', new Date().toLocaleString()],
    ['', ''],
    ['Pattern Configuration', ''],
    ['Pattern Name', data.patternName],
    ['Cycle Length (days)', data.cycleLength.toString()],
    ['Active Days', data.activeDays.toString()],
    ['Rest Days', data.restDays.toString()],
    ['Shift Length (hours)', data.shiftLength.toString()],
    ['', ''],
    ['Feasibility Results', ''],
    ['Weekly Hours', data.weeklyHours.toFixed(1)],
    ['Required Staff', data.requiredStaff.toString()],
    ['Current Staff Count', data.staffCount.toString()],
    ['Buffer Percentage', `${data.bufferPercent}%`],
    ['Standard Contract Hours (h/week)', data.standardContractHours.toString()],
    ['Available Hours/Week', data.availableHoursPerWeek.toFixed(1)],
    ['Overtime Gap/Week', data.overtimeGapPerWeek.toFixed(1)],
    ['FTE Required', data.fteRequired.toFixed(2)],
    ['FTE Available', data.fteAvailable.toFixed(2)],
    ['', ''],
    ['WTD Compliance', ''],
    ['11h Rest Period', data.wtd.restOk ? 'Compliant' : 'Non-Compliant'],
    ['48h Weekly Average', data.wtd.avgOk ? 'Compliant' : 'Non-Compliant'],
  ];
  
  const csvContent = rows.map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `feasibility-report-${data.patternName.replace(/\s+/g, '-')}-${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
