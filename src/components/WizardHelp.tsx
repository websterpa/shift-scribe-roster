import React from "react";
import { Link } from "react-router-dom";

type WizardStep = 1|2|3|4|5;

export default function WizardHelp({ step, onClose }: { step: WizardStep; onClose?: ()=>void }) {
  const content = getContent(step);
  return (
    <aside
      className="fixed bottom-4 right-4 z-40 w-[min(92vw,420px)] max-h-[80vh] overflow-auto rounded-2xl border bg-white shadow-xl"
      role="dialog"
      aria-labelledby="wizard-help-title"
    >
      <div className="flex items-center justify-between border-b p-4">
        <h2 id="wizard-help-title" className="text-sm font-semibold">Wizard Help</h2>
        <button className="btn" onClick={onClose} aria-label="Close help">✕</button>
      </div>
      <div className="p-4 text-sm text-slate-700 space-y-3">
        {content}
        <div className="pt-2 border-t">
          <p className="text-xs text-slate-500">
            Need more detail? See the full <Link className="underline" to="/help">Help &amp; Support</Link>.
          </p>
        </div>
      </div>
    </aside>
  );
}

function KBD({children}:{children:React.ReactNode}) {
  return <kbd className="px-1.5 py-0.5 rounded border bg-slate-50">{children}</kbd>;
}

function getContent(step: WizardStep) {
  switch (step) {
    case 1:
      return (
        <>
          <p><b>Basics</b> sets your shift system and horizon.</p>
          <ul className="list-disc list-inside">
            <li><b>8h</b>: E (Early), L (Late), N (Night). <b>12h</b>: D (Day), N (Night).</li>
            <li><b>R</b> = Rest Day. Include recovery time to meet ≥ 11h rest.</li>
            <li>Pick the site's local start time (e.g., 06:00 or 07:00).</li>
          </ul>
          <p>Use <KBD>Tab</KBD> to move fields; changes apply instantly.</p>
        </>
      );
    case 2:
      return (
        <>
          <p><b>Pattern</b> is the rota template (what repeats).</p>
          <ul className="list-disc list-inside">
            <li>Choose a preset or build a custom sequence with tokens (E/L/N/D/R).</li>
            <li>The heatmap flags rest risks: 🟢 ≥13h, 🟡 11–13h, 🔴 &lt;11h.</li>
            <li>Save named patterns to reuse across your site.</li>
          </ul>
          <p>Tip: add <b>R (Rest Day)</b> between Nights and Days to avoid warnings.</p>
        </>
      );
    case 3:
      return (
        <>
          <p><b>Staffing Levels</b> define how many people you need per shift per day.</p>
          <ul className="list-disc list-inside">
            <li>Use Presets (Small/Standard/Large) then fine-tune per day.</li>
            <li>Inputs are whole numbers; fields auto-fit and never overlap.</li>
            <li>Values drive weekly totals, hours, and cost estimates later.</li>
          </ul>
          <p>Scroll horizontally on smaller screens to see all 7 days.</p>
        </>
      );
    case 4:
      return (
        <>
          <p><b>Rates &amp; Budget</b> controls cost previews only.</p>
          <ul className="list-disc list-inside">
            <li>Set Staff/Supervisor rates and role mix by shift.</li>
            <li>Budget threshold: warn if over by more than this amount.</li>
            <li>Definitive costs apply at generation (OT multipliers, Sundays/PH).</li>
          </ul>
        </>
      );
    case 5:
      return (
        <>
          <p><b>Review &amp; Generate</b> shows weekly totals and estimated hours.</p>
          <ul className="list-disc list-inside">
            <li>Fix any warnings before generating.</li>
            <li>Generation runs a short optimisation (~5s) and shows toasts.</li>
            <li>If over budget, you'll see a clear warning toast.</li>
          </ul>
        </>
      );
    default:
      return null;
  }
}