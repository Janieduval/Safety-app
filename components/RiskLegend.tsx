"use client";

import { useState } from "react";
import { RISK_RATING_DEFINITIONS } from "@/lib/constants";

function dotColor(key: string) {
  switch (key) {
    case "low":
      return "bg-emerald-700";
    case "medium":
      return "bg-amber-500";
    case "high":
      return "bg-orange-600";
    case "extreme":
      return "bg-red-700";
    default:
      return "bg-neutral-400";
  }
}

export default function RiskLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-emerald-700 font-medium underline decoration-dotted"
      >
        {open ? "Hide" : "What do these ratings mean?"}
      </button>
      {open && (
        <ul className="mt-2 space-y-2 bg-neutral-50 border border-neutral-200 rounded-lg p-3">
          {RISK_RATING_DEFINITIONS.map((r) => (
            <li key={r.key} className="flex gap-2">
              <span className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${dotColor(r.key)}`} />
              <span>
                <span className="font-semibold text-neutral-900">{r.label}</span>
                <span className="text-neutral-700"> — {r.description}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
