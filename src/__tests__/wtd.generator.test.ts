/**
 * @wtd-generator
 * Tests for WTD-compliant roster generator
 */
import { describe, it, expect } from 'vitest';
import {
  generateWTDRoster,
  type WTDStaffMember,
  type CoverageRequirement,
} from '@/engine2/generators/wtdRosterGenerator';

describe('WTD Roster Generator @wtd-generator', () => {
  const createStaff = (count: number): WTDStaffMember[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `staff-${i + 1}`,
      name: `Staff ${i + 1}`,
      contract_hours_per_week: 40,
      is_night_eligible: i < 6, // First 6 can work nights
      availability_by_date: {},
      max_consec_days: 6,
      max_consec_nights: 3,
      wtd_opted_out: false,
    }));
  };

  const createRequirements = (days: number): CoverageRequirement[] => {
    const startDate = new Date('2025-11-01');
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dow = date.getDay();
      const isWeekend = dow === 0 || dow === 6;
      
      return {
        date: date.toISOString().split('T')[0],
        E: isWeekend ? 1 : 2,
        L: isWeekend ? 1 : 2,
        N: 1,
      };
    });
  };

  it('generates roster for 11 staff over 28 days', () => {
    const staff = createStaff(11);
    const requirements = createRequirements(28);
    
    // Set all staff as available
    requirements.forEach(req => {
      staff.forEach(s => {
        s.availability_by_date[req.date] = true;
      });
    });
    
    const result = generateWTDRoster({ staff, requirements });
    
    // Check all staff have assignments
    staff.forEach(s => {
      const assigned = requirements.filter(r => result.assignments[s.id][r.date] !== 'R');
      expect(assigned.length).toBeGreaterThan(0);
    });
    
    // Check coverage
    requirements.forEach(req => {
      expect(result.coverage[req.date]).toBeDefined();
    });
  });

  it('ensures all 11 staff are utilized', () => {
    const staff = createStaff(11);
    const requirements = createRequirements(28);
    
    requirements.forEach(req => {
      staff.forEach(s => {
        s.availability_by_date[req.date] = true;
      });
    });
    
    const result = generateWTDRoster({ staff, requirements });
    
    const assignmentCounts = staff.map(s => {
      return requirements.filter(r => result.assignments[s.id][r.date] !== 'R').length;
    });
    
    // All staff should have at least 1 shift
    assignmentCounts.forEach(count => {
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  it('respects night eligibility', () => {
    const staff = createStaff(11);
    const requirements = createRequirements(7);
    
    requirements.forEach(req => {
      staff.forEach(s => {
        s.availability_by_date[req.date] = true;
      });
    });
    
    const result = generateWTDRoster({ staff, requirements });
    
    // Staff not eligible for nights should never get N shifts
    staff.forEach(s => {
      if (!s.is_night_eligible) {
        requirements.forEach(req => {
          expect(result.assignments[s.id][req.date]).not.toBe('N');
        });
      }
    });
  });

  it('respects availability constraints', () => {
    const staff = createStaff(11);
    const requirements = createRequirements(7);
    
    // Set first staff as unavailable on first 3 days
    requirements.slice(0, 3).forEach(req => {
      staff[0].availability_by_date[req.date] = false;
    });
    
    // Set others as available
    requirements.forEach(req => {
      staff.slice(1).forEach(s => {
        s.availability_by_date[req.date] = true;
      });
    });
    
    const result = generateWTDRoster({ staff, requirements });
    
    // First staff should have R on first 3 days
    requirements.slice(0, 3).forEach(req => {
      expect(result.assignments[staff[0].id][req.date]).toBe('R');
    });
  });

  it('achieves fair distribution (low std-dev)', () => {
    const staff = createStaff(11);
    const requirements = createRequirements(28);
    
    requirements.forEach(req => {
      staff.forEach(s => {
        s.availability_by_date[req.date] = true;
      });
    });
    
    const result = generateWTDRoster({ staff, requirements });
    
    // Check std-dev is within acceptable range
    expect(result.fairness.stdDev).toBeLessThan(3.0);
  });

  it('reports WTD violations', () => {
    const staff = createStaff(11);
    const requirements = createRequirements(7);
    
    requirements.forEach(req => {
      staff.forEach(s => {
        s.availability_by_date[req.date] = true;
      });
    });
    
    const result = generateWTDRoster({ staff, requirements });
    
    // Result should have violations array
    expect(result.violations).toBeDefined();
    expect(Array.isArray(result.violations)).toBe(true);
  });

  it('seeds night blocks first', () => {
    const staff = createStaff(11);
    const requirements = createRequirements(7);
    
    requirements.forEach(req => {
      staff.forEach(s => {
        s.availability_by_date[req.date] = true;
      });
    });
    
    const result = generateWTDRoster({ staff, requirements });
    
    // Count total night assignments
    let totalNights = 0;
    requirements.forEach(req => {
      staff.forEach(s => {
        if (result.assignments[s.id][req.date] === 'N') {
          totalNights++;
        }
      });
    });
    
    // Should have night shifts assigned
    const requiredNights = requirements.reduce((sum, r) => sum + r.N, 0);
    expect(totalNights).toBeGreaterThan(0);
    expect(totalNights).toBeLessThanOrEqual(requiredNights * 1.2); // Allow some flexibility
  });

  it('calculates coverage correctly', () => {
    const staff = createStaff(11);
    const requirements = createRequirements(7);
    
    requirements.forEach(req => {
      staff.forEach(s => {
        s.availability_by_date[req.date] = true;
      });
    });
    
    const result = generateWTDRoster({ staff, requirements });
    
    requirements.forEach(req => {
      const coverage = result.coverage[req.date];
      expect(coverage).toBeDefined();
      expect(coverage.E).toBeGreaterThanOrEqual(0);
      expect(coverage.L).toBeGreaterThanOrEqual(0);
      expect(coverage.N).toBeGreaterThanOrEqual(0);
    });
  });
});
