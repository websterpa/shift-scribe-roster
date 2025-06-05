
import React, { useState, useEffect } from "react";
import { generateAndSaveRoster } from "@/utils/enhancedRosterCalculations";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Staff {
  id: string;
  name: string;
  role: string;
  eligible_shifts: string[];
  is_shift_worker: boolean;
  min_hours_per_week: number;
  max_hours_per_week: number;
  opted_out_wtd: boolean;
  hourly_rate: number;
  holiday_multiplier: number;
  leave_allowance_days: number;
}

interface Config {
  id?: string;
  cycle_length_weeks: number;
  shift_type: "8h" | "12h";
  operational_hours_per_day: number;
  handshake_minutes: number;
  start_date: string;
}

interface Props {
  staffList: Staff[];
  config: Config;
  showWeeks?: number; // how many weeks to display (e.g. 4 or 8)
}

function weekdayLabel(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

export default function MultiWeekRoster({ staffList, config, showWeeks = 4 }: Props) {
  const [versionId, setVersionId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, Record<string, string>>>({});
  const [totalHours, setTotalHours] = useState<Record<string, number>>({});
  const [totalCost, setTotalCost] = useState<Record<string, number>>({});
  const [columns, setColumns] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('MultiWeekRoster: Starting roster generation');
    
    // Generate & save roster version
    (async () => {
      setLoading(true);
      try {
        const vid = await generateAndSaveRoster(staffList, { ...config, id: config.id! });
        console.log('Generated roster version:', vid);
        setVersionId(vid);

        // Fetch assignments for this version
        const { data: rows, error } = await supabase
          .from("roster_assignments")
          .select("*")
          .eq("roster_version_id", vid);

        if (error) {
          console.error('Error fetching assignments:', error);
          return;
        }

        console.log('Fetched assignments:', rows?.length || 0);

        // Build assignments map and totals
        const assignMap: Record<string, Record<string, string>> = {};
        const hoursMap: Record<string, number> = {};
        const costMap: Record<string, number> = {};
        
        rows?.forEach((r: any) => {
          const dateKey = new Date(r.shift_date).toDateString();
          assignMap[dateKey] = assignMap[dateKey] || {};
          assignMap[dateKey][r.staff_id] = r.shift_type;
          // Note: hours and cost would need to be calculated from shift times
          // For now, using basic estimates
          const hours = r.shift_type === "R" ? 0 : (config.shift_type === "12h" ? 12 : 8);
          hoursMap[r.staff_id] = (hoursMap[r.staff_id] || 0) + hours;
          
          const staff = staffList.find(s => s.id === r.staff_id);
          const cost = staff ? hours * staff.hourly_rate : 0;
          costMap[r.staff_id] = (costMap[r.staff_id] || 0) + cost;
        });
        
        setAssignments(assignMap);
        setTotalHours(hoursMap);
        setTotalCost(costMap);

        // Build column dates for showWeeks
        const cols: Date[] = [];
        for (let w = 0; w < showWeeks; w++) {
          for (let d = 0; d < 7; d++) {
            const date = new Date(config.start_date);
            date.setDate(date.getDate() + w * 7 + d);
            cols.push(date);
          }
        }
        setColumns(cols);
      } catch (error) {
        console.error('Error in roster generation:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [staffList, config, showWeeks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Generating roster...</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-white z-10 min-w-[120px]">Name</TableHead>
            {columns.map((date, idx) => (
              <TableHead key={idx} className="text-center min-w-[50px] text-xs">
                <div>{weekdayLabel(date)}</div>
                <div>{date.getDate()}</div>
              </TableHead>
            ))}
            <TableHead className="text-center min-w-[80px]">Total Hrs</TableHead>
            <TableHead className="text-center min-w-[80px]">Total £</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staffList.map((staff) => (
            <TableRow key={staff.id}>
              <TableCell className="sticky left-0 bg-white font-medium">{staff.name}</TableCell>
              {columns.map((date) => {
                const code = assignments[date.toDateString()]?.[staff.id] || "R";
                return (
                  <TableCell key={date.toDateString()} className="text-center h-12">
                    <span className={`text-sm font-medium ${
                      code === "R" ? "text-gray-400" : 
                      code === "S" ? "text-red-500" :
                      code === "D" ? "text-blue-600" :
                      code === "N" ? "text-purple-600" :
                      code === "E" ? "text-green-600" :
                      code === "L" ? "text-orange-600" :
                      "text-black"
                    }`}>
                      {code}
                    </span>
                  </TableCell>
                );
              })}
              <TableCell className="text-center">{totalHours[staff.id] || 0}</TableCell>
              <TableCell className="text-center">
                £{(totalCost[staff.id] || 0).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
