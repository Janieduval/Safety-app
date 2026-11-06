"use client";

import { useState } from "react";
import { RISK_RATING_DEFINITIONS } from "@/lib/constants";

// Colours match the rating buttons in the form.
const STYLE: Record<string, { bar: string; pill: string }> = {
  low: { bar: "bg-emerald-700", pill: "bg-emerald-700 text-white" },
  medium: { bar: "bg-amber-500", pill: "bg-amber-500 text-white" },
  high: { bar: "bg-orange-600", pill: "bg-orange-600 text-white" },
  extreme: { bar: "bg-red-700", pill: "bg-red-700 text-white" },
};

// "What do these ratings mean?" — one guide for both the initial and the
// residual risk rating, based on the company risk matrix.
export default function RiskLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-emerald-700 font-medium underline decoration-dotted"
      >
        {open ? "Hide" : "What do these ratings mean?"}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-sm text-neutral-800">
            Think about the worst injury that could realistically happen, and how likely it is. Rate the{" "}
            <b>initial risk</b> before any controls, and the <b>residual risk</b> with your controls in place.
          </p>

          <ul className="mt-3 space-y-2">
            {RISK_RATING_DEFINITIONS.map((r) => {
              const s = STYLE[r.key];
              return (
                <li
                  key={r.key}
                  className="relative overflow-hidden rounded-lg bg-white border border-neutral-200 pl-3.5 pr-3 py-2.5"
                >
                  <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${s.bar}`} />
                  <span className={`inline-block text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${s.pill}`}>
                    {r.label}
                  </span>
                  <dl className="mt-1.5 space-y-0.5 text-[13px] leading-snug">
                    <div>
                      <dt className="inline font-semibold text-neutral-900">Injury: </dt>
                      <dd className="inline text-neutral-700">{r.consequence}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-neutral-900">Likelihood: </dt>
                      <dd className="inline text-neutral-700">{r.likelihood}</dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 text-xs text-neutral-500">Not sure? Pick the higher rating.</p>
        </div>
      )}
    </div>
  );
}
