import React, { useMemo, useState, useEffect } from "react";
import { useRosterGenerator } from "@/hooks/useRosterGenerator";
import type { ManagerRosterForm } from "@/types/managerUI";
import { RosterSummaryCard } from "@/components/RosterSummaryCard";
import CoverageBuilderModal from "@/components/CoverageBuilderModal";
import { toast } from "@/hooks/use-toast";

const DEFAULT_COVERAGE_JSON =
`{
  "0": { "E": 2, "L": 2, "N": 1, "D": 0 },  // Sunday
  "1": { "E": 3, "L": 3, "N": 1, "D": 0 },  // Monday
  "2": { "E": 3, "L": 3, "N": 1, "D": 0 },
  "3": { "E": 3, "L": 3, "N": 1, "D": 0 },
  "4": { "E": 3, "L": 3, "N": 1, "D": 0 },
  "5": { "E": 3, "L": 3, "N": 1, "D": 0 },  // Friday
  "6": { "E": 2, "L": 2, "N": 1, "D": 0 }   // Saturday
}`;

export default function GenerateRosterPanel() {
  const { optimising, result, error, run } = useRosterGenerator();
  const [covModalOpen, setCovModalOpen] = useState(false);
  const [form, setForm] = useState<ManagerRosterForm>({
    shiftSystem: "8h",
    siteStartLocalTime: "06:00",
    timezone: "Europe/London",
    weeks: 17,
    allowSupervisorNights: false,
    capPublicHolidaysPerPerson: 2,
    budget: null,
    defaultOtHours: 4,
    defaultOtStartLocalTime: "10:00",
    coverageJSON: DEFAULT_COVERAGE_JSON
  });

  // Toast notifications for roster generation
  useEffect(() => {
    if (result?.ok) {
      toast({
        title: "Roster Generated Successfully",
        description: "Your roster has been optimized and is ready for review 🎉",
        variant: "default"
      });

      // Budget variance toasts
      if (result.summary) {
        const { budget, budgetVariance } = result.summary;
        if (typeof budget === "number" && typeof budgetVariance === "number") {
          if (budgetVariance > 0) {
            // Over budget
            toast({
              title: "Budget Warning",
              description: `Over budget by £${Math.abs(budgetVariance).toLocaleString()}`,
              variant: "destructive"
            });
          } else if (budgetVariance < 0) {
            // Under budget
            toast({
              title: "Great News!",
              description: `Under budget by £${Math.abs(budgetVariance).toLocaleString()}`,
              variant: "default"
            });
          }
          // exactly on budget -> no additional toast
        }
      }
    }
  }, [result]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Generation Failed",
        description: `Error: ${error} ❌`,
        variant: "destructive"
      });
    }
  }, [error]);

  const budgetVarianceStr = useMemo(() => {
    const v = result?.summary?.budgetVariance;
    if (v == null) return "—";
    return v > 0 ? `Over by £${v.toLocaleString()}` : v < 0 ? `Under by £${Math.abs(v).toLocaleString()}` : "On budget";
  }, [result]);

  function update<K extends keyof ManagerRosterForm>(k: K, v: ManagerRosterForm[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function openBuilder() { setCovModalOpen(true); }
  function saveCoverageJSON(json: string) { setForm(prev => ({ ...prev, coverageJSON: json })); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Quick client guard: prevent mixing systems via coverage hints
    if (form.shiftSystem === "8h" && form.coverageJSON.includes('"D"')) {
      alert("12h 'D' shifts cannot be used with 8h system.");
      return;
    }
    if (form.shiftSystem === "12h" && (form.coverageJSON.includes('"E"') || form.coverageJSON.includes('"L"'))) {
      alert("8h 'E'/'L' shifts cannot be used with 12h system.");
      return;
    }
    await run(form);
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <h2 className="text-2xl font-bold mb-4">Generate Roster</h2>

      {optimising && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
          Optimising roster (up to 5s)…
        </div>
      )}

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border p-4 space-y-3">
          <h3 className="font-semibold text-slate-700">Basics</h3>
          <Label>Shift system</Label>
          <select className="input" value={form.shiftSystem} onChange={e => update("shiftSystem", e.target.value as any)}>
            <option value="8h">8h (E/L/N)</option>
            <option value="12h">12h (D/N)</option>
          </select>

          <Label>Site start time</Label>
          <input className="input" type="time" value={form.siteStartLocalTime} onChange={e => update("siteStartLocalTime", e.target.value)} />

          <Label>Timezone</Label>
          <input className="input" placeholder="Europe/London" value={form.timezone} onChange={e => update("timezone", e.target.value)} />

          <Label>Weeks</Label>
          <input className="input" type="number" min={1} max={26} value={form.weeks} onChange={e => update("weeks", Number(e.target.value))} />
        </div>

        <div className="rounded-xl border p-4 space-y-3">
          <h3 className="font-semibold text-slate-700">Rules & Budget</h3>
          <Label><input type="checkbox" className="mr-2" checked={form.allowSupervisorNights} onChange={e => update("allowSupervisorNights", e.target.checked)} /> Allow supervisor nights</Label>

          <Label>PH cap per person</Label>
          <input className="input" type="number" min={0} value={form.capPublicHolidaysPerPerson} onChange={e => update("capPublicHolidaysPerPerson", Number(e.target.value))} />

          <Label>Budget (optional)</Label>
          <input className="input" type="number" min={0} step="0.01" value={form.budget ?? ""} onChange={e => update("budget", e.target.value === "" ? null : Number(e.target.value))} />
        </div>

        <div className="rounded-xl border p-4 space-y-3">
          <h3 className="font-semibold text-slate-700">Overtime defaults</h3>
          <Label>Default OT hours</Label>
          <input className="input" type="number" min={1} step="0.5" value={form.defaultOtHours ?? 4} onChange={e => update("defaultOtHours", Number(e.target.value))} />

          <Label>Default OT start time</Label>
          <input className="input" type="time" value={form.defaultOtStartLocalTime ?? ""} onChange={e => update("defaultOtStartLocalTime", e.target.value)} />
        </div>

        <div className="md:col-span-3 rounded-xl border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-700">Coverage targets</h3>
            <button type="button" className="btn" onClick={openBuilder}>Open Preset Builder</button>
          </div>
          <p className="text-xs text-slate-500 mb-2">
            One object per weekday (0=Sun … 6=Sat). Valid keys depend on system: 8h → E/L/N, 12h → D/N.
          </p>
          <textarea className="input h-40 font-mono text-sm" value={form.coverageJSON} onChange={e => update("coverageJSON", e.target.value)} />
        </div>

        <div className="md:col-span-3">
          <button type="submit" className="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90">Generate roster</button>
        </div>
      </form>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900">
          {error}
        </div>
      )}

      {result?.ok && result.summary && (
        <div className="mb-10">
          <RosterSummaryCard summary={result.summary} />
        </div>
      )}

      <CoverageBuilderModal
        open={covModalOpen}
        onClose={() => setCovModalOpen(false)}
        shiftSystem={form.shiftSystem}
        initialJSON={form.coverageJSON}
        onSaveJSON={(json) => { saveCoverageJSON(json); setCovModalOpen(false); }}
        siteId={undefined} // Optional: can be set to specific site ID if available
      />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm text-slate-600">{children}</label>;
}