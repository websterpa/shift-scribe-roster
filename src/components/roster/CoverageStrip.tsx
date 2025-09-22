import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CoverageStripProps {
  versionId: string;
}

interface ShiftData {
  need: number;
  planned: number;
  variance: number;
}

interface DayData {
  day: string;
  shifts: Record<string, ShiftData>;
}

export function CoverageStrip({ versionId }: CoverageStripProps) {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCoverageData() {
      try {
        setLoading(true);
        setError(null);
        
        const { data: matrixData, error: matrixError } = await supabase
          .rpc('rpc_roster_staffing_matrix', { version_id: versionId });

        if (matrixError) throw matrixError;

        const coverage: DayData[] = (matrixData || []).map((row: any) => ({
          day: row.day,
          shifts: row.shifts || {}
        }));

        setData(coverage);
      } catch (err: any) {
        console.error('Coverage strip error:', err);
        setError(err.message || 'Failed to load coverage data');
      } finally {
        setLoading(false);
      }
    }

    if (versionId) {
      fetchCoverageData();
    }
  }, [versionId]);

  const getVariancePill = (shift: ShiftData) => {
    const { need, planned, variance } = shift;
    if (planned >= need) {
      return planned > need 
        ? 'bg-blue-100 text-blue-800 border-blue-200' // over-staffed
        : 'bg-green-100 text-green-800 border-green-200'; // exact
    }
    return 'bg-red-100 text-red-800 border-red-200'; // deficit
  };

  if (loading) {
    return (
      <div className="sticky top-0 bg-white border-b p-4">
        <div className="animate-pulse h-16 bg-gray-100 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sticky top-0 bg-white border-b p-4">
        <div className="text-red-600 text-sm">Coverage error: {error}</div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 bg-white border-b shadow-sm z-10">
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Coverage Overview</h3>
        <div className="overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {data.map((dayData) => (
              <div key={dayData.day} className="flex-shrink-0 border rounded-lg p-2 min-w-[120px]">
                <div className="text-xs font-medium text-center mb-2">{dayData.day}</div>
                <div className="space-y-1">
                  {Object.entries(dayData.shifts).map(([shiftCode, shift]) => (
                    <div key={shiftCode} className="flex items-center justify-between text-xs">
                      <span className="font-mono">{shiftCode}</span>
                      <span className={`px-2 py-1 rounded border text-xs ${getVariancePill(shift)}`}>
                        {shift.planned}/{shift.need}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}