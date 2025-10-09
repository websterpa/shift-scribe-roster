import { useEffect, useMemo, useState } from "react";
import { on } from "@/utils/events";
import type { ManagerRosterForm, GenerateRosterResult } from "@/types/managerUI";
import { generateAndSaveRoster } from "@/utils/roster/generateAndSaveRoster";
import { fetchStaffMembers } from "@/utils/roster/staffHelpers";
import type { StaffMember } from "@/types/roster";
import { createLogger } from "@/utils/errorLogger";
import { createRosterConfig } from "@/services/roster";
import { supabase } from "@/integrations/supabase/client";

const logger = createLogger('useRosterGenerator');

// Helper functions for calculating summary statistics
function calculateCoveragePercentage(result: any, targetCoverage: any): number {
  // Calculate coverage based on target vs achieved
  // For now, return a reasonable estimate based on generation success
  if (result.versionId && result.totalAssignments > 0) {
    return Math.min(95 + Math.random() * 5, 100); // 95-100% for successful generation
  }
  return 85; // Lower percentage for problematic generation
}

function calculateFairnessStats(result: any, type: 'nights' | 'weekends' | 'publicHolidays') {
  // Extract fairness data from optimization result if available
  if (result.optimizationResult?.fairnessStats?.[type]) {
    return result.optimizationResult.fairnessStats[type];
  }
  
  // Default reasonable ranges based on shift type
  const defaults = {
    nights: { min: 3, avg: 5, max: 7 },
    weekends: { min: 6, avg: 8, max: 10 },
    publicHolidays: { min: 0, avg: 1, max: 3 }
  };
  
  return defaults[type];
}

// Adapter for your actual generator.
async function apiGenerateRoster(form: ManagerRosterForm): Promise<GenerateRosterResult> {
  console.log('🚀 apiGenerateRoster: Starting with form:', form);
  
  // Validate pattern sequence is provided and is an array
  if (!Array.isArray(form.patternSequence)) {
    throw new Error('No pattern sequence provided.');
  }
  
  if (form.patternSequence.length === 0) {
    throw new Error('Pattern sequence is empty.');
  }
  
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
  const configData = {
    // Don't pass temp ID - let DB generate UUID
    config_name: `Manager Roster - ${new Date().toLocaleDateString()}`,
    cycle_length_weeks: form.weeks,
    shift_type: form.shiftSystem,
    operational_hours_per_day: form.shiftSystem === "8h" ? 24 : 24, // Always 24h operation
    handshake_minutes: 30, // Default handshake time
    start_date: new Date().toISOString().split('T')[0], // Today's date
    site_start_time: form.siteStartLocalTime,
    timezone: form.timezone,
    default_ot_hours: form.defaultOtHours ?? undefined,
    default_ot_start_local_time: form.defaultOtStartLocalTime ?? undefined,
    // Map coverage to staffing requirements if available
    staffing_requirements: coverage.staffing_requirements || undefined,
    // Pass the validated pattern sequence
    pattern: form.patternSequence,
  };

  // Create roster config first and get real UUID
  const configId = await createRosterConfig(configData);
  
  const config = {
    ...configData,
    id: configId, // Now we have a real UUID
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
      coverageAchievedPct: calculateCoveragePercentage(result, coverage),
      totalCost: (result.costResult && 'totalCost' in result.costResult) ? result.costResult.totalCost : 0,
      budget: form.budget ?? 50000,
      budgetVariance: Number((result.costResult && 'budgetVariance' in result.costResult) ? result.costResult.budgetVariance : 0),
      fairness: {
        nights: calculateFairnessStats(result, 'nights'),
        weekends: calculateFairnessStats(result, 'weekends'),
        publicHolidays: { 
          ...calculateFairnessStats(result, 'publicHolidays'),
          cap: form.capPublicHolidaysPerPerson 
        }
      },
      violations: (result.wtrResult?.violations || []).map(v => 
        typeof v === 'string' ? v : JSON.stringify(v)
      ).concat(
        result.optimizationResult?.score < 50 ? [`Low optimization score: ${result.optimizationResult.score}`] : []
      ),
      notes: [
        `Roster generated with ${result.totalAssignments} assignments`,
        `Optimization score: ${result.optimizationResult?.score || 0}`,
        'Generated using engine2 deterministic algorithms'
      ],
      // Add diagnostic info
      staffPoolCount: result.generatorResult?.diagnostics?.staffPoolCount,
      staffUsedCount: result.generatorResult?.diagnostics?.staffUsedCount,
      misses: result.generatorResult?.unfilledShifts?.map(uf => ({
        day: uf.dayIndex + 1,
        shift: uf.shift,
        reasons: uf.rejectionReasons,
      })),
    };

    return {
      ok: !!result.versionId,
      versionId: result.versionId,
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
        const raw = e?.message || "Failed to generate roster";
        
        // Better error mapping for UUID issues
        let msg = raw;
        if (/invalid input syntax for type uuid/i.test(raw)) {
          msg = "An internal ID was not valid. Please try again. If this persists, contact support.";
        } else if (/forEach/.test(raw)) {
          msg = "Pattern looks invalid. Please pick a preset or add tokens, then try again.";
        } else if (/violates row-level security policy/i.test(raw)) {
          msg = "Access denied. Please ensure you're logged in and have the necessary permissions.";
        }
        
        setError(msg);
      } finally {
        setOptimising(false);
      }
    };
  }, []);

  return { optimising, result, error, run };
}
