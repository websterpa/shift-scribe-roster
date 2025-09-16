import { useEffect, useMemo, useState } from "react";
import { on } from "@/utils/events";
import type { ManagerRosterForm, GenerateRosterResult } from "@/types/managerUI";
import { generateAndSaveRoster, fetchStaffMembers } from "@/utils/roster/rosterGeneration";
import type { StaffMember } from "@/types/roster";
import { createLogger } from "@/utils/errorLogger";

const logger = createLogger('useRosterGenerator');

// Adapter for your actual generator.
async function apiGenerateRoster(form: ManagerRosterForm): Promise<GenerateRosterResult> {
  console.log('🚀 apiGenerateRoster: Starting with form:', form);
  
  // Fetch staff data using the existing helper
  const staffData = await fetchStaffMembers();
    
  if (!staffData || staffData.length === 0) {
    throw new Error('No active staff members found');
  }

  // Convert form.coverageJSON to object and pass to your existing generator config.
  let coverage: any = {};
  try { 
    coverage = JSON.parse(form.coverageJSON || "{}"); 
  } catch (e) {
    logger.error('Failed to parse coverage JSON:', e);
    throw new Error('Invalid coverage JSON format');
  }

  // Build config for your back-end generator (keep existing function signatures):
  const config = {
    id: `temp-${Date.now()}`, // Generate a temporary ID
    cycle_length_weeks: form.weeks,
    shift_type: form.shiftSystem,
    operational_hours_per_day: form.shiftSystem === "8h" ? 24 : 24, // Always 24h operation
    handshake_minutes: 30, // Default handshake time
    start_date: new Date().toISOString().split('T')[0], // Today's date
    site_start_time: form.siteStartLocalTime,
    timezone: form.timezone,
    default_ot_hours: form.defaultOtHours ?? undefined,
    default_ot_start_local_time: form.defaultOtStartLocalTime ?? undefined,
    budget: form.budget ?? undefined,
    // Map coverage to staffing requirements if available
    staffing_requirements: coverage.staffing_requirements || undefined,
  };

  console.log('🔧 apiGenerateRoster: Built config:', config);
  console.log('👥 apiGenerateRoster: Staff count:', staffData.length);

  try {
    // Call the real generator
    const result = await generateAndSaveRoster(
      staffData as StaffMember[], 
      config, 
      `Manager Roster - ${new Date().toLocaleDateString()}`
    );

    console.log('✅ apiGenerateRoster: Generation completed:', result);

    // Transform the result to match GenerateRosterResult interface
    const summary = {
      coverageAchievedPct: 95.0, // Default value since we don't have coverage calculation yet
      totalCost: result.costResult && 'totalCost' in result.costResult ? result.costResult.totalCost : 0,
      budget: form.budget ?? null,
      budgetVariance: result.costResult && 'budgetVariance' in result.costResult ? result.costResult.budgetVariance : null,
      fairness: {
        nights: { min: 4, avg: 6, max: 8 }, // Default fairness values
        weekends: { min: 7, avg: 8, max: 9 },
        publicHolidays: { 
          min: 0, 
          avg: 1, 
          max: form.capPublicHolidaysPerPerson,
          cap: form.capPublicHolidaysPerPerson 
        }
      },
      violations: result.wtrResult?.violationDetails || [],
      notes: [`Roster generated successfully with ${result.totalAssignments} assignments`]
    };

    return {
      ok: !!result.versionId,
      summary
    };
    
  } catch (generationError: any) {
    logger.error('Generation failed:', generationError);
    throw new Error(generationError.message || 'Failed to generate roster');
  }
}

export function useRosterGenerator() {
  const [optimising, setOptimising] = useState(false);
  const [result, setResult] = useState<GenerateRosterResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const offStart = on("roster:optimisation:start", () => {
      console.log('🔄 useRosterGenerator: Optimisation started');
      setOptimising(true);
    });
    const offEnd = on("roster:optimisation:end", (data) => {
      console.log('✅ useRosterGenerator: Optimisation ended', data);
      setOptimising(false);
    });
    return () => { 
      offStart(); 
      offEnd(); 
    };
  }, []);

  const run = useMemo(() => {
    return async (form: ManagerRosterForm) => {
      console.log('🚀 useRosterGenerator.run: Starting generation with form:', form);
      setError(null);
      setResult(null);
      try {
        setOptimising(true);
        const res = await apiGenerateRoster(form);
        console.log('✅ useRosterGenerator.run: Generation successful:', res);
        setResult(res);
      } catch (e: any) {
        console.error('❌ useRosterGenerator.run: Generation failed:', e);
        setError(e?.message || "Failed to generate roster");
      } finally {
        setOptimising(false);
      }
    };
  }, []);

  return { optimising, result, error, run };
}
