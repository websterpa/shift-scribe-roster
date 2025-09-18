import React, { useMemo, useState } from "react";
import { useRosterGenerator } from "@/hooks/useRosterGenerator";
import { useToast } from "@/hooks/use-toast";
import { computeWeeklyTotals, computeEstimatedWeeklyHours } from "@/utils/coveragePresets";

type ShiftSystem = "8h" | "12h";
type Weekday = 0|1|2|3|4|5|6;

type PatternToken8h = "E"|"L"|"N"|"O"; // O = off
type PatternToken12h = "D"|"N"|"O";

type PatternSpec =
  | { system: "8h"; sequence: PatternToken8h[]; repeatWeeks: number }
  | { system: "12h"; sequence: PatternToken12h[]; repeatWeeks: number };

type CoverageShape = Record<Weekday, Partial<Record<"E"|"L"|"N"|"D", number>>>;

/* --- Rest-risk helpers --- */

function parseHHmm(hhmm: string): number {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m) return 6 * 60; // default 06:00 in minutes
  return Number(m[1]) * 60 + Number(m[2]);
}

type Token = "E"|"L"|"N"|"O"|"D"; // union of all possible tokens

function isOff(tok?: string) { return tok === "O"; }

function shiftWindowMinutes(system: "8h"|"12h", tok: Token): [number, number] | null {
  // Returns [startOffsetMin, endOffsetMin] from site start T, or null for off
  if (tok === "O") return null;
  if (system === "8h") {
    if (tok === "E") return [0, 8*60];
    if (tok === "L") return [8*60, 16*60];
    if (tok === "N") return [16*60, 24*60];
    return null;
  } else {
    if (tok === "D") return [0, 12*60];
    if (tok === "N") return [12*60, 24*60];
    return null;
  }
}

/** Compute rest hours between adjacent tokens in a per-day sequence. */
export function computeRestRiskBetweenDays(args: {
  system: "8h"|"12h",
  siteStartLocalTime: string,
  sequence: Token[]
}): Array<{
  index: number;          // edge between day index and index+1
  prev: Token;
  next: Token;
  restHours: number;      // hours between prev end and next start
  severity: "ok"|"warn"|"risk";
  message: string;
}> {
  const results: Array<any> = [];
  if (!args.sequence || args.sequence.length < 2) return results;
  const sys = args.system;
  const T = parseHHmm(args.siteStartLocalTime); // minutes from midnight; used only for semantics

  for (let i = 0; i < args.sequence.length - 1; i++) {
    const prev = args.sequence[i] as Token;
    const next = args.sequence[i+1] as Token;

    // If either side is off: rest is at least a calendar day gap ⇒ safe
    if (isOff(prev) || isOff(next)) {
      results.push({
        index: i, prev, next, restHours: 24,
        severity: "ok",
        message: "Includes an off day — ample rest."
      });
      continue;
    }

    const prevWin = shiftWindowMinutes(sys, prev);
    const nextWin = shiftWindowMinutes(sys, next);
    if (!prevWin || !nextWin) {
      results.push({ index: i, prev, next, restHours: 24, severity: "ok", message: "Off day present." });
      continue;
    }

    // Day i ends at T + prevWin[1] (same day)
    const prevEndAbs = T + prevWin[1];

    // Day i+1 starts at next calendar day at T + nextWin[0] + 24h
    const nextStartAbs = (T + 24*60) + nextWin[0];

    const restMin = nextStartAbs - prevEndAbs;
    const restHours = Math.round((restMin / 60) * 10) / 10; // one decimal

    let severity: "ok"|"warn"|"risk" = "ok";
    let message = `Rest ${restHours}h`;
    if (restHours < 11) { severity = "risk"; message = `Rest ${restHours}h (<11h)`; }
    else if (restHours < 13) { severity = "warn"; message = `Rest ${restHours}h (11–13h)`; }

    results.push({ index: i, prev, next, restHours, severity, message });
  }
  return results;
}

function RestRiskLegend() {
  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-700"
      aria-label="Rest risk legend"
    >
      <span className="inline-flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded bg-emerald-500" aria-hidden="true" /> 🟢 ≥13h
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded bg-amber-400" aria-hidden="true" /> 🟡 11–13h
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded bg-red-500" aria-hidden="true" /> 🔴 &lt;11h
      </span>
    </div>
  );
}

function RestRiskHeatmap({
  edges
}: {
  edges: Array<{ index:number; prev:Token; next:Token; restHours:number; severity:"ok"|"warn"|"risk"; message:string }>;
}) {
  if (!edges.length) return null;
  return (
    <div className="mt-3">
      <div className="text-sm font-semibold text-muted-foreground mb-1">Rest risk across the sequence</div>
      <div className="flex flex-wrap gap-1">
        {edges.map(e => (
          <div
            key={e.index}
            title={`${e.prev} → ${e.next}: ${e.message}`}
            className={`w-4 h-4 rounded ${e.severity === "risk" ? "bg-red-500" : e.severity === "warn" ? "bg-amber-400" : "bg-emerald-500"}`}
            aria-label={`${e.prev} to ${e.next}: ${e.message}`}
          />
        ))}
      </div>
      <RestRiskLegend />
      {/* Summary line with first few issues */}
      {edges.some(e => e.severity !== "ok") && (
        <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside">
          {edges.filter(e => e.severity !== "ok").slice(0, 3).map(e => (
            <li key={`issue-${e.index}`}>
              <b>{e.prev}→{e.next}</b> — {e.message}
            </li>
          ))}
          {edges.filter(e => e.severity !== "ok").length > 3 && (
            <li>+ more potential rest constraints</li>
          )}
        </ul>
      )}
      {!edges.some(e => e.severity !== "ok") && (
        <p className="mt-2 text-xs text-emerald-700">All adjacent days have ≥13h rest or an off day in between.</p>
      )}
    </div>
  );
}

interface WizardState {
  // Step 1
  system: ShiftSystem;
  siteStartLocalTime: string; // HH:mm
  timezone: string;
  weeks: number;

  // Step 2
  pattern: PatternSpec;

  // Step 3
  coverage: CoverageShape;

  // Step 4
  staffRate: number;
  supervisorRate: number;
  roleMix: Record<"E"|"L"|"N"|"D", number>; // 0..100 supervisor %
  budget?: number | null;
  budgetWarnThreshold: number;
  allowSupervisorNights: boolean;
  capPublicHolidaysPerPerson: number;
}

const DEFAULT_COVERAGE_8H: CoverageShape = {
  0:{E:2,L:2,N:1}, 1:{E:3,L:3,N:1}, 2:{E:3,L:3,N:1}, 3:{E:3,L:3,N:1},
  4:{E:3,L:3,N:1}, 5:{E:3,L:3,N:1}, 6:{E:2,L:2,N:1}
};

const DEFAULT_COVERAGE_12H: CoverageShape = {
  0:{D:3,N:1}, 1:{D:4,N:1}, 2:{D:4,N:1}, 3:{D:4,N:1},
  4:{D:4,N:1}, 5:{D:4,N:1}, 6:{D:3,N:1}
};

const PRESETS_8H: Array<{name:string, seq:PatternToken8h[]}> = [
  { name:"2E–2L–2N–4O", seq:["E","E","L","L","N","N","O","O","O","O"] },
  { name:"4 on 4 off (E/L mix)", seq:["E","E","E","E","O","O","O","O"] },
  { name:"Nights-leaning", seq:["E","L","N","N","N","O","O"] },
];

const PRESETS_12H: Array<{name:string, seq:PatternToken12h[]}> = [
  { name:"4D–4O–4N–4O", seq:["D","D","D","D","O","O","O","O","N","N","N","N","O","O","O","O"] },
  { name:"Days-only 4 on 4 off", seq:["D","D","D","D","O","O","O","O"] },
  { name:"2D–2N–4O", seq:["D","D","N","N","O","O","O","O"] },
];

export default function RosterWizard() {
  const { toast } = useToast();
  const { optimising, result, error, run } = useRosterGenerator();

  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(() => ({
    system: "8h",
    siteStartLocalTime: "06:00",
    timezone: "Europe/London",
    weeks: 17,
    pattern: { system: "8h", sequence: PRESETS_8H[0].seq, repeatWeeks: 17 },
    coverage: DEFAULT_COVERAGE_8H,
    staffRate: 18,
    supervisorRate: 24,
    roleMix: { E:10, L:10, N:20, D:15 },
    budget: null,
    budgetWarnThreshold: 500,
    allowSupervisorNights: false,
    capPublicHolidaysPerPerson: 2
  }));

  // Derived previews
  const totals = useMemo(() => computeWeeklyTotals(state.system, state.coverage as any), [state.system, state.coverage]);
  const estHours = useMemo(() => computeEstimatedWeeklyHours(state.system, state.coverage as any), [state.system, state.coverage]);

  function update<K extends keyof WizardState>(k: K, v: WizardState[K]) {
    setState(prev => ({ ...prev, [k]: v }));
  }

  // Basic validation
  function validateStep(s: number): string[] {
    const issues: string[] = [];
    if (s >= 1) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(state.siteStartLocalTime)) {
        issues.push("Site start time must be HH:mm.");
      }
      if (state.weeks < 1 || state.weeks > 26) issues.push("Weeks must be between 1 and 26.");
    }
    if (s >= 2) {
      // disallow mixing codes across systems
      if (state.system === "8h" && (state.pattern as any).sequence.some((t: string)=> t==="D")) {
        issues.push("8h system cannot include 'D' (12h day) in pattern.");
      }
      if (state.system === "12h" && (state.pattern as any).sequence.some((t: string)=> t==="E" || t==="L")) {
        issues.push("12h system cannot include 'E'/'L' (8h) in pattern.");
      }
    }
    if (s >= 3) {
      // coverage keys compat check
      const json = JSON.stringify(state.coverage);
      if (state.system === "8h" && json.includes("\"D\"")) issues.push("8h coverage cannot include 'D'.");
      if (state.system === "12h" && (json.includes("\"E\"") || json.includes("\"L\""))) issues.push("12h coverage cannot include 'E'/'L'.");
    }
    if (s >= 4) {
      if (state.staffRate < 0 || state.supervisorRate < 0) issues.push("Rates must be positive.");
      if (state.budgetWarnThreshold < 0) issues.push("Budget threshold must be >= 0.");
      if (!state.allowSupervisorNights && (state.roleMix.N ?? 0) > 0) {
        // Heads-up only (not blocking)
      }
    }
    return issues;
  }

  async function onGenerate() {
    const issues = validateStep(5);
    if (issues.length) {
      toast({
        title: "Validation Error",
        description: `Please fix: ${issues[0]}`,
        variant: "destructive"
      });
      return;
    }

    // Build config for generator
    const coverage = state.coverage;

    try {
      await run({
        shiftSystem: state.system,
        siteStartLocalTime: state.siteStartLocalTime,
        timezone: state.timezone,
        weeks: state.weeks,
        allowSupervisorNights: state.allowSupervisorNights,
        capPublicHolidaysPerPerson: state.capPublicHolidaysPerPerson,
        budget: state.budget ?? null,
        defaultOtHours: 4,
        defaultOtStartLocalTime: "10:00",
        coverageJSON: JSON.stringify(coverage)
      });
      // Success toast already wired in your panel; add here too for standalone use
      toast({
        title: "Success!",
        description: "Roster generated successfully 🎉"
      });
    } catch (e:any) {
      toast({
        title: "Generation Error",
        description: e?.message || "Error generating roster ❌",
        variant: "destructive"
      });
    }
  }

  function next() {
    const issues = validateStep(step);
    if (issues.length) {
      toast({
        title: "Validation Error", 
        description: issues[0],
        variant: "destructive"
      });
      return;
    }
    setStep(s => Math.min(5, s+1));
  }
  function back() { setStep(s => Math.max(1, s-1)); }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">Roster Wizard</h1>
      <p className="text-muted-foreground mb-6">Quickly define a repeating pattern and site configuration, then generate your roster.</p>

      <Steps current={step} />

      <div className="rounded-2xl border bg-card shadow-sm p-4 md:p-6 mt-4">
        {step === 1 && <StepBasics state={state} update={update} />}
        {step === 2 && <StepPattern state={state} update={update} />}
        {step === 3 && <StepCoverage state={state} update={update} />}
        {step === 4 && <StepRatesBudget state={state} update={update} />}
        {step === 5 && <StepReview state={state} totals={totals} estHours={estHours} />}

        <div className="mt-6 flex items-center justify-between">
          <button 
            className="px-4 py-2 rounded-lg border hover:bg-muted transition-colors" 
            onClick={back} 
            disabled={step===1}
          >
            ← Back
          </button>
          {step < 5 ? (
            <button 
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors" 
              onClick={next}
            >
              Next →
            </button>
          ) : (
            <button 
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50" 
              onClick={onGenerate} 
              disabled={optimising}
            >
              {optimising ? "Optimising (up to 5s)…" : "Generate roster"}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-destructive bg-destructive/10 p-3 text-destructive">
            {error}
          </div>
        )}
        {result?.ok && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">
            Generation complete. See summary on the Manager page.
          </div>
        )}
      </div>
    </div>
  );
}

/* ————— UI bits ————— */

function Steps({ current }: { current:number }) {
  const items = ["Basics","Pattern","Coverage","Rates & Budget","Review & Generate"];
  return (
    <ol className="flex flex-wrap gap-2 text-sm">
      {items.map((t,i)=>(
        <li key={t} className={`px-3 py-1 rounded-full border ${i+1<=current ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
          {i+1}. {t}
        </li>
      ))}
    </ol>
  );
}

function StepBasics({ state, update }:{ state: WizardState; update: <K extends keyof WizardState>(k:K,v:WizardState[K])=>void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm text-muted-foreground mb-1">Shift system</label>
        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" value={state.system} onChange={e=>{
          const sys = e.target.value as ShiftSystem;
          update("system", sys);
          // swap coverage & pattern defaults to match system
          if (sys==="8h") {
            update("coverage", DEFAULT_COVERAGE_8H);
            update("pattern", { system:"8h", sequence: PRESETS_8H[0].seq, repeatWeeks: state.weeks });
          } else {
            update("coverage", DEFAULT_COVERAGE_12H);
            update("pattern", { system:"12h", sequence: PRESETS_12H[0].seq, repeatWeeks: state.weeks });
          }
        }}>
          <option value="8h">8h (E/L/N)</option>
          <option value="12h">12h (D/N)</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-muted-foreground mb-1">Site start time</label>
        <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" type="time" value={state.siteStartLocalTime} onChange={e=>update("siteStartLocalTime", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-muted-foreground mb-1">Timezone (IANA)</label>
        <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" placeholder="Europe/London" value={state.timezone} onChange={e=>update("timezone", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-muted-foreground mb-1">Horizon (weeks)</label>
        <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" type="number" min={1} max={26} value={state.weeks} onChange={e=>{
          const w = Number(e.target.value)||17;
          update("weeks", w);
          update("pattern", { ...state.pattern, repeatWeeks: w } as PatternSpec);
        }} />
      </div>
    </div>
  );
}

function StepPattern({ state, update }:{ state: WizardState; update: any }) {
  const is8 = state.system==="8h";
  const presets = is8 ? PRESETS_8H : PRESETS_12H;
  const keys = is8 ? (["E","L","N","O"] as const) : (["D","N","O"] as const);

  function addToken(tok: string) {
    const seq:any[] = [...(state.pattern as any).sequence, tok];
    update("pattern", { system: state.system, sequence: seq, repeatWeeks: state.weeks });
  }
  function removeLast() {
    const seq:any[] = [...(state.pattern as any).sequence];
    seq.pop();
    update("pattern", { system: state.system, sequence: seq, repeatWeeks: state.weeks });
  }

  const edges = computeRestRiskBetweenDays({
    system: state.system,
    siteStartLocalTime: state.siteStartLocalTime,
    sequence: (state.pattern as any).sequence as Token[],
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-3">
        <div className="font-semibold mb-2">Choose a preset</div>
        <div className="flex flex-wrap gap-2">
          {presets.map(p=>(
            <button key={p.name} className="px-3 py-2 rounded-lg border bg-background hover:bg-muted transition-colors" onClick={()=>update("pattern", { system: state.system, sequence: p.seq, repeatWeeks: state.weeks })}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border p-3">
        <div className="font-semibold mb-2">Or build a custom sequence</div>
        <div className="flex flex-wrap gap-2 mb-2">
          {keys.map(k=>(
            <button key={k} className="px-3 py-2 rounded-lg border bg-background hover:bg-muted transition-colors" onClick={()=>addToken(k)}>{k}</button>
          ))}
          <button className="px-3 py-2 rounded-lg border bg-background hover:bg-muted transition-colors" onClick={removeLast}>⌫ Remove last</button>
        </div>
        <div className="text-sm text-muted-foreground">Sequence:</div>
        <div className="mt-2 flex flex-wrap gap-1">
          {(state.pattern as any).sequence.map((t:string, i:number)=>(
            <span key={i} className="px-2 py-1 rounded bg-muted border text-sm">{t}</span>
          ))}
          {!(state.pattern as any).sequence.length && <span className="text-muted-foreground text-sm">Empty — add tokens above</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Tip: include <code>O</code> (Off) days to avoid rest violations; supervisors typically excluded from <code>N</code> (Nights).
        </p>

        {/* NEW: rest-risk heatmap */}
        <RestRiskHeatmap edges={edges} />
      </div>
    </div>
  );
}

function StepCoverage({ state, update }:{ state: WizardState; update:any }) {
  const is8 = state.system==="8h";
  const dayLabels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  function setVal(day: Weekday, shift: "E"|"L"|"N"|"D", v:number) {
    const next = structuredClone(state.coverage);
    next[day] ||= {};
    (next[day] as any)[shift] = Math.max(0, Math.floor(v||0));
    update("coverage", next);
  }
  function applyPreset(size:"Small"|"Standard"|"Large") {
    const base = is8 ? structuredClone(DEFAULT_COVERAGE_8H) : structuredClone(DEFAULT_COVERAGE_12H);
    if (size==="Small") {
      Object.values(base).forEach((row:any)=>Object.keys(row).forEach(k=>row[k]=Math.max(0, (row[k]||0)-1)));
    }
    if (size==="Large") {
      Object.values(base).forEach((row:any)=>Object.keys(row).forEach(k=>row[k]=(row[k]||0)+1));
    }
    update("coverage", base);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button className="px-3 py-2 rounded-lg border bg-background hover:bg-muted transition-colors" onClick={()=>applyPreset("Small")}>Preset: Small</button>
        <button className="px-3 py-2 rounded-lg border bg-background hover:bg-muted transition-colors" onClick={()=>applyPreset("Standard")}>Preset: Standard</button>
        <button className="px-3 py-2 rounded-lg border bg-background hover:bg-muted transition-colors" onClick={()=>applyPreset("Large")}>Preset: Large</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {dayLabels.map((d,idx)=>(
          <div key={d} className="rounded-xl border p-3">
            <div className="font-semibold text-sm mb-2">{d}</div>
            <div className="space-y-2">
              {is8 ? (["E","L","N"] as const).map(k=>(
                <Row key={k} label={`Shift ${k}`}>
                  <InputNumber value={Number((state.coverage[idx as Weekday] as any)?.[k] ?? 0)} onChange={v=>setVal(idx as Weekday, k, v)} />
                </Row>
              )) : (["D","N"] as const).map(k=>(
                <Row key={k} label={`Shift ${k}`}>
                  <InputNumber value={Number((state.coverage[idx as Weekday] as any)?.[k] ?? 0)} onChange={v=>setVal(idx as Weekday, k, v)} />
                </Row>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepRatesBudget({ state, update }:{ state: WizardState; update:any }) {
  const shiftKeys = state.system==="8h" ? (["E","L","N"] as const) : (["D","N"] as const);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="rounded-xl border p-3 space-y-2">
        <div className="font-semibold">Rates (£/hr)</div>
        <Row label="Staff">
          <InputNumber value={state.staffRate} step={0.5} onChange={v=>update("staffRate", Math.max(0,v))} />
        </Row>
        <Row label="Supervisor">
          <InputNumber value={state.supervisorRate} step={0.5} onChange={v=>update("supervisorRate", Math.max(0,v))} />
        </Row>
        <div className="text-xs text-muted-foreground">Estimates; definitive costing happens at generation with real rates & OT multipliers.</div>
      </div>

      <div className="rounded-xl border p-3 space-y-2 md:col-span-2">
        <div className="font-semibold">Supervisor mix by shift (%)</div>
        {shiftKeys.map(k=>(
          <Row key={k} label={`Shift ${k}`}>
            <InputNumber value={state.roleMix[k] ?? 0} min={0} max={100} onChange={v=>{
              const m = { ...state.roleMix, [k]: Math.min(100, Math.max(0, Math.floor(v||0))) };
              update("roleMix", m);
            }} />
          </Row>
        ))}
        <Row label="Allow supervisor nights">
          <input type="checkbox" className="ml-2" checked={state.allowSupervisorNights} onChange={e=>update("allowSupervisorNights", e.target.checked)} />
        </Row>
      </div>

      <div className="rounded-xl border p-3 space-y-2">
        <div className="font-semibold">Budget & Threshold</div>
        <Row label="Budget (£)">
          <InputNumber value={state.budget ?? 0} step={100} onChange={v=>update("budget", Number.isFinite(v) ? v : null)} />
        </Row>
        <Row label="Warn if over by more than (£)">
          <InputNumber value={state.budgetWarnThreshold} step={50} onChange={v=>update("budgetWarnThreshold", Math.max(0, Math.floor(v||0)))} />
        </Row>
        <Row label="PH cap per person">
          <InputNumber value={state.capPublicHolidaysPerPerson} onChange={v=>update("capPublicHolidaysPerPerson", Math.max(0, Math.floor(v||0)))} />
        </Row>
      </div>
    </div>
  );
}

function StepReview({ state, totals, estHours }:{ state: WizardState; totals:any; estHours:any }) {
  const shiftKeys = state.system==="8h" ? ["E","L","N"] : ["D","N"];
  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-3">
        <div className="font-semibold mb-2">Summary</div>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li>System: <b>{state.system}</b> • Site start: <b>{state.siteStartLocalTime}</b> • TZ: <b>{state.timezone}</b> • Horizon: <b>{state.weeks} weeks</b></li>
          <li>Pattern length: <b>{(state.pattern as any).sequence.length}</b> days • Repeats: <b>{state.weeks} weeks</b></li>
          <li>Rates: Staff £{state.staffRate.toFixed(2)}/h • Supervisor £{state.supervisorRate.toFixed(2)}/h</li>
          <li>Budget: {state.budget ? `£${state.budget.toLocaleString()}` : "—"} • Warn if over by: £{state.budgetWarnThreshold.toLocaleString()}</li>
        </ul>
      </div>

      <div className="rounded-xl border p-3">
        <div className="font-semibold mb-2">Weekly totals & estimated hours</div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {shiftKeys.map(k=>(
            <div key={k} className="rounded-lg border p-3 bg-muted">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Shift {k}</div>
              <div className="text-lg font-semibold">{totals.byShift[k] ?? 0} / {estHours.byShift[k] ?? 0}h</div>
            </div>
          ))}
          <div className="rounded-lg border p-3 md:col-span-2 bg-muted">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Overall</div>
            <div className="text-lg font-semibold">{totals.overall ?? 0} / {estHours.overall ?? 0}h</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Hours are estimates based on shift system (8h for E/L/N, 12h for D/N).</p>
      </div>

      {!state.allowSupervisorNights && (state.roleMix.N ?? 0) > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
          Heads-up: Supervisor mix for Nights is &gt; 0% but "Allow supervisor nights" is off.
        </div>
      )}
    </div>
  );
}

/* small UI helpers */
function Row({label, children}:{label:string; children:React.ReactNode}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}
function InputNumber({ value, onChange, min=0, max=999, step=1 }:{
  value:number; onChange:(v:number)=>void; min?:number; max?:number; step?:number;
}) {
  return (
    <input className="flex h-10 w-28 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" type="number" min={min} max={max} step={step}
      value={Number.isFinite(value)? value : 0}
      onChange={e=>onChange(Number(e.target.value))}
    />
  );
}