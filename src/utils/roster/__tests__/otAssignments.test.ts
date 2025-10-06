import { describe, it, expect, beforeEach } from 'vitest';
import { makeShiftWindowResolver, OTOptions } from '@/utils/shiftWindowResolver';
import { durationHours, shiftCost } from '@/utils/costing';
import { createCommonOTPatterns, validateOTRequest, createOTCycleEntry } from '../otAssignmentHelper';

describe('Variable OT Assignments', () => {
  let resolveShiftWindow: ReturnType<typeof makeShiftWindowResolver>;

  beforeEach(() => {
    resolveShiftWindow = makeShiftWindowResolver({
      shiftSystem: '8h',
      siteStartLocalTime: '07:00',
      timezone: 'Europe/London',
      defaultOtHours: 4,
      defaultOtStartLocalTime: '10:00'
    });
  });

  describe('OT Window Resolution', () => {
    it('should create 4-hour OT starting at 10:00', () => {
      const otOpts: OTOptions = {
        otHours: 4,
        otStartLocalTime: '10:00'
      };

      const window = resolveShiftWindow('2024-01-15', 'OT', otOpts);
      
      expect(window).not.toBeNull();
      expect(window!.start.getHours()).toBe(10);
      expect(window!.start.getMinutes()).toBe(0);
      
      const hours = durationHours(window!.start, window!.end);
      expect(hours).toBe(4);
    });

    it('should create 3.5-hour OT starting at 18:30', () => {
      const otOpts: OTOptions = {
        otHours: 3.5,
        otStartLocalTime: '18:30'
      };

      const window = resolveShiftWindow('2024-01-15', 'OT', otOpts);
      
      expect(window).not.toBeNull();
      expect(window!.start.getHours()).toBe(18);
      expect(window!.start.getMinutes()).toBe(30);
      
      const hours = durationHours(window!.start, window!.end);
      expect(hours).toBe(3.5);
    });

    it('should use site defaults when no OT options provided', () => {
      const window = resolveShiftWindow('2024-01-15', 'OT');
      
      expect(window).not.toBeNull();
      expect(window!.start.getHours()).toBe(10); // defaultOtStartLocalTime
      
      const hours = durationHours(window!.start, window!.end);
      expect(hours).toBe(4); // defaultOtHours
    });

    it('should use system fallback when no defaults provided', () => {
      const resolver8h = makeShiftWindowResolver({
        shiftSystem: '8h',
        siteStartLocalTime: '07:00',
        timezone: 'Europe/London'
        // No defaults
      });

      const window = resolver8h('2024-01-15', 'OT');
      
      expect(window).not.toBeNull();
      expect(window!.start.getHours()).toBe(7); // Site start time (T0)
      
      const hours = durationHours(window!.start, window!.end);
      expect(hours).toBe(8); // 8h system fallback
    });
  });

  describe('OT Costing', () => {
    it('should calculate correct cost for 4-hour weekday OT', () => {
      const otOpts: OTOptions = {
        otHours: 4,
        otStartLocalTime: '10:00'
      };

      const window = resolveShiftWindow('2024-01-15', 'OT', otOpts); // Monday
      const cost = shiftCost(window!.start, window!.end, 20);

      // 4 hours * £20 * 1.5 (OT multiplier) = £120
      expect(cost).toBe(120);
    });

    it('should calculate correct cost for Sunday OT', () => {
      const otOpts: OTOptions = {
        otHours: 6,
        otStartLocalTime: '14:00'
      };

      const window = resolveShiftWindow('2024-01-14', 'OT', otOpts); // Sunday
      const cost = shiftCost(window!.start, window!.end, 15);

      // 6 hours * £15 * 2.0 (Sunday multiplier) = £180
      expect(cost).toBe(180);
    });
  });

  describe('OT Helper Functions', () => {
    it('should create correct OT cycle entries', () => {
      const entry = createOTCycleEntry(5, 'staff-123', {
        otHours: 4,
        otStartLocalTime: '10:00'
      });

      expect(entry).toEqual({
        day: 5,
        staffId: 'staff-123',
        shiftCode: 'OT',
        date: '',
        otOptions: {
          otHours: 4,
          otStartLocalTime: '10:00'
        }
      });
    });

    it('should validate OT requests correctly', () => {
      const validRequest = {
        staffId: 'staff-123',
        dateISO: '2024-01-15',
        otHours: 4,
        otStartLocalTime: '10:00'
      };

      const result = validateOTRequest(validRequest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid OT requests', () => {
      const invalidRequest = {
        staffId: '',
        dateISO: '',
        otHours: -2,
        otStartLocalTime: '25:70'
      };

      const result = validateOTRequest(invalidRequest);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should create common OT patterns correctly', () => {
      const patterns = createCommonOTPatterns();
      
      const morningTopUp = patterns.morningTopUp(0, 'staff-1');
      expect(morningTopUp.otOptions?.otHours).toBe(4);
      expect(morningTopUp.otOptions?.otStartLocalTime).toBe('10:00');

      const custom = patterns.custom(1, 'staff-2', 5.5, '13:15');
      expect(custom.otOptions?.otHours).toBe(5.5);
      expect(custom.otOptions?.otStartLocalTime).toBe('13:15');
    });
  });

  describe('Cross-system compatibility', () => {
    it('should work with 12-hour system', () => {
      const resolver12h = makeShiftWindowResolver({
        shiftSystem: '12h',
        siteStartLocalTime: '07:00',
        timezone: 'Europe/London'
      });

      const otOpts: OTOptions = {
        otHours: 6,
        otStartLocalTime: '15:00'
      };

      const window = resolver12h('2024-01-15', 'OT', otOpts);
      
      expect(window).not.toBeNull();
      expect(window!.start.getHours()).toBe(15);
      
      const hours = durationHours(window!.start, window!.end);
      expect(hours).toBe(6);
    });

    it('should handle different timezones', () => {
      const resolverUS = makeShiftWindowResolver({
        shiftSystem: '8h',
        siteStartLocalTime: '06:00',
        timezone: 'America/New_York'
      });

      const otOpts: OTOptions = {
        otHours: 4,
        otStartLocalTime: '14:00'
      };

      const window = resolverUS('2024-01-15', 'OT', otOpts);
      
      expect(window).not.toBeNull();
      
      const hours = durationHours(window!.start, window!.end);
      expect(hours).toBe(4);
    });
  });
});