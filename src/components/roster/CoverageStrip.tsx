import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toCode } from '@/features/roster/monthly/shiftMapping';

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

export default function CoverageStrip({ versionId }: CoverageStripProps) {
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

        if (matrixError) {
          console.error('Coverage strip RPC error:', matrixError);
          throw new Error("Coverage query returned no data (no demo fallback).");
        }

        const coverage: DayData[] = (matrixData || []).map((row: any) => ({
          day: row.day,
          shifts: row.shifts || {}
        }));

        if (!coverage || coverage.length === 0) {
          throw new Error("Coverage query returned no data (no demo fallback).");
        }

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

  if (loading) return <div className="p-4">Loading coverage…</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="overflow-x-auto rounded-lg border bg-white shadow">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="p-2 text-left">Day</th>
            <th className="p-2 text-left">Shifts</th>
          </tr>
        </thead>
        <tbody>
          {data.map((dayData, i) => (
            <tr key={i} className="border-t">
              <td className="p-2 font-semibold">{dayData.day}</td>
              <td className="p-2">
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(dayData.shifts).map(([shiftCode, shift]) => {
                    const diff = shift.planned - shift.need;
                    const color =
                      diff < 0 ? "bg-red-100 text-red-700"
                      : diff === 0 ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700";
                    return (
                      <span key={shiftCode} className={`px-2 py-1 rounded ${color}`}>
                        {shiftCode}: {shift.planned}/{shift.need}
                      </span>
                    );
                  })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}