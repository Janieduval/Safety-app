"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// "+ Add company": a name and a colour. Projects that say COMPANY=<this name>
// in their Vercel settings land under it.

const COLORS = ["#047857", "#2563eb", "#d97706", "#7c3aed", "#db2777", "#0891b2", "#4b5563"];

export default function AddCompanyButton({ variant = "button" }: { variant?: "button" | "sidebar" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[1]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/control/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res || !res.ok) return setError(data?.error ?? "No connection. Try again.");
    setOpen(false);
    setName("");
    router.push(`/control/companies/${data.company.id}`);
    router.refresh();
  };

  return (
    <>
      {variant === "sidebar" ? (
        <button type="button" onClick={() => setOpen(true)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-emerald-50/90 hover:bg-white/10 hover:text-white">
          <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Add company
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="text-sm px-4 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-800 font-semibold hover:bg-neutral-50">
          + Add company
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 md:p-6" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-xl p-5 pb-8 md:pb-5 text-neutral-900">
            <p className="text-lg font-bold">Add a company</p>
            <p className="text-sm text-neutral-500 mt-0.5">
              Its projects show up under it once their Vercel setting <code className="text-xs bg-neutral-100 rounded px-1">COMPANY</code> has this exact name.
            </p>
            <label className="block mt-4 text-sm font-semibold">Company name</label>
            <input
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="e.g. ACLE Services"
              className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-base md:text-sm"
            />
            <label className="block mt-4 text-sm font-semibold">Colour</label>
            <div className="mt-1.5 flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className={`w-8 h-8 rounded-lg ${color === c ? "ring-2 ring-offset-2 ring-neutral-800" : ""}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
            <div className="mt-5 flex gap-2 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="text-sm px-4 py-2 rounded-xl border border-neutral-300 bg-white">
                Cancel
              </button>
              <button type="button" onClick={save} disabled={busy || !name.trim()} className="text-sm px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold disabled:opacity-50">
                {busy ? "Adding…" : "Add company"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
