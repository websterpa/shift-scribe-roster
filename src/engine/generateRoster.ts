/**
 * Atlas Roster Generator - Pattern-Based Assignment Engine
 * 
 * Generates roster assignments by applying staff-assigned shift patterns
 * from the site_patterns table.
 */

import { supabase } from "@/integrations/supabase/client";
import { createLogger } from "@/utils/errorLogger";

const logger = createLogger('AtlasRosterGenerator');

export interface GenerateRosterInput {
  tenantId?: string;
  siteId?: string;
  startDate: Date;
  endDate: Date;
}

export interface RosterAssignment {
  staffId: string;
  staffName: string;
  dayIndex: number;
  date: Date;
  shift: string;
  patternId: string;
}

/**
 * Generate roster assignments based on staff patterns
 * 
 * @param input - Roster generation parameters
 * @returns Array of generated assignments
 */
export async function generateRoster(input: GenerateRosterInput): Promise<RosterAssignment[]> {
  const { tenantId, siteId, startDate, endDate } = input;
  
  console.log('[AtlasGenerator] Starting roster generation', {
    tenantId,
    siteId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });
  
  // 1. Load staff with their pattern assignments
  const { data: staff, error: staffError } = await supabase
    .from("staff_profiles")
    .select("id, first_name, last_name, pattern_id, pattern_offset")
    .eq("is_active", true)
    .not("pattern_id", "is", null);
  
  if (staffError) {
    logger.error(new Error('Failed to load staff'), { error: staffError });
    throw new Error(`Failed to load staff: ${staffError.message}`);
  }
  
  if (!staff || staff.length === 0) {
    console.warn('[AtlasGenerator] No staff found with assigned patterns');
    return [];
  }
  
  console.log(`[AtlasGenerator] Loaded ${staff.length} staff members with patterns`);
  
  // 2. Load all shift patterns
  const patternIds = [...new Set(staff.map(s => s.pattern_id).filter(Boolean))] as string[];
  
  const { data: patterns, error: patternsError } = await supabase
    .from("site_patterns")
    .select("id, name, sequence, cycle_length, system")
    .in("id", patternIds);
  
  if (patternsError) {
    logger.error(new Error('Failed to load patterns'), { error: patternsError });
    throw new Error(`Failed to load patterns: ${patternsError.message}`);
  }
  
  if (!patterns || patterns.length === 0) {
    console.warn('[AtlasGenerator] No patterns found for staff');
    return [];
  }
  
  // Build pattern lookup map with proper type conversion
  const patternMap = Object.fromEntries(
    patterns.map(p => {
      // Convert sequence from Json to string array
      const sequence = Array.isArray(p.sequence) 
        ? p.sequence.filter((item): item is string => typeof item === 'string')
        : [];
      
      return [
        p.id,
        {
          id: p.id,
          name: p.name,
          sequence,
          cycle_length: p.cycle_length,
          system: p.system,
        }
      ];
    })
  );
  
  console.log(`[AtlasGenerator] Loaded ${patterns.length} patterns:`, 
    patterns.map(p => ({ id: p.id, name: p.name, system: p.system }))
  );
  
  // 3. Generate day-by-day shifts
  const roster: RosterAssignment[] = [];
  const totalDays = Math.floor(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  
  for (const member of staff) {
    const pattern = patternMap[member.pattern_id!];
    if (!pattern) {
      console.warn(`[AtlasGenerator] Pattern not found for staff ${member.id}`);
      continue;
    }
    
    const sequence = pattern.sequence;
    const cycleLength = pattern.cycle_length || sequence.length;
    const offset = member.pattern_offset || 0;
    
    for (let day = 0; day < totalDays; day++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      
      // Calculate position in pattern (with offset)
      const patternIndex = (day + offset) % cycleLength;
      const code = sequence[patternIndex];
      
      // Skip rest days and invalid codes
      if (!code || code === "R") {
        continue;
      }
      
      roster.push({
        staffId: member.id,
        staffName: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
        dayIndex: day,
        date,
        shift: code,
        patternId: pattern.id,
      });
    }
  }
  
  console.log(`[AtlasGenerator] Generated ${roster.length} assignments across ${staff.length} staff`);
  
  // Log shift type distribution
  const shiftCounts = roster.reduce((acc, a) => {
    acc[a.shift] = (acc[a.shift] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('[AtlasGenerator] Shift distribution:', shiftCounts);
  
  return roster;
}
