"use client";

import { useEffect, useState } from "react";

// "Suggest an idea": a button that opens a small form. Anyone can use it —
// workers, supervisors and admins. Ideas go to the admin Suggestions page.
//
// variant "card"    — a white card with a short line and the button (worker home)
// variant "sidebar" — a button for the green sidebar on a computer
// variant "tile"    — a white tile, like the Links tiles on a phone

function BulbIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z" />
    </svg>
  );
}

export default function SuggestionBox({
  variant = "card",
  askName = false,
  className = "",
}: {
  variant?: "card" | "sidebar" | "tile";
  askName?: boolean; // workers aren't logged in, so they can add their name
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState(""); // hidden; only bots fill it in
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Close with the Escape key on a computer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const start = () => {
    setSent(false);
    setError(null);
    setOpen(true);
  };

  const send = async () => {
    if (busy) return;
    if (text.trim().length < 5) {
      setError("Please write a few words about your idea.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, name, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
      } else {
        setSent(true);
        setText("");
      }
    } catch {
      setError("No connection. Try again when you have signal.");
    }
    setBusy(false);
  };

  let trigger: React.ReactNode;
  if (variant === "sidebar") {
    trigger = (
      <button
        type="button"
        onClick={start}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-emerald-50/90 hover:bg-white/10 hover:text-white ${className}`}
      >
        <BulbIcon className="w-[18px] h-[18px]" />
        Suggest an idea
      </button>
    );
  } else if (variant === "tile") {
    trigger = (
      <button
        type="button"
        onClick={start}
        className={`w-full flex items-center gap-2.5 rounded-2xl bg-white border border-neutral-200 px-3 py-2.5 shadow-sm active:bg-neutral-50 text-left ${className}`}
      >
        <span className="w-8 h-8 shrink-0 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
          <BulbIcon className="w-4 h-4" />
        </span>
        <span className="flex-1 text-sm font-medium text-neutral-800 leading-tight">Suggest an idea</span>
        <span className="text-neutral-400">→</span>
      </button>
    );
  } else {
    trigger = (
      <div className={`bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 flex items-center gap-3 ${className}`}>
        <span className="w-10 h-10 shrink-0 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
          <BulbIcon />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-900">Got an idea for JSAFE?</p>
          <p className="text-xs text-neutral-500">Tell us what to change or add.</p>
        </div>
        <button
          type="button"
          onClick={start}
          className="shrink-0 text-sm px-3 py-2 rounded-xl border border-emerald-700 text-emerald-700 font-semibold active:bg-emerald-50"
        >
          Suggest
        </button>
      </div>
    );
  }

  return (
    <>
      {trigger}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Suggest an idea"
            onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-xl p-5 pb-8 md:pb-5 text-neutral-900"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 shrink-0 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <BulbIcon />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold leading-tight">Suggest an idea</p>
                <p className="text-xs text-neutral-500">It goes to the JSAFE admin team.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-neutral-500 hover:bg-neutral-100"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            {sent ? (
              <div className="mt-5 text-center">
                <span className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
                </span>
                <p className="mt-3 font-semibold">Thanks — your idea has been sent.</p>
                <p className="mt-1 text-sm text-neutral-600">The admin team reads every one.</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-5 w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold active:bg-emerald-800"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-sm font-semibold text-neutral-800" htmlFor="suggestion-text">
                    What would you like changed or added?
                  </label>
                  <textarea
                    id="suggestion-text"
                    value={text}
                    autoFocus
                    rows={5}
                    maxLength={2000}
                    onChange={(e) => {
                      setText(e.target.value);
                      setError(null);
                    }}
                    placeholder="e.g. Add Crane lift to the permits list"
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3 py-2.5 bg-white text-base md:text-sm"
                  />
                </div>
                {askName && (
                  <div>
                    <label className="text-sm font-semibold text-neutral-800" htmlFor="suggestion-name">
                      Your name <span className="font-normal text-neutral-500">(optional)</span>
                    </label>
                    <input
                      id="suggestion-name"
                      value={name}
                      maxLength={80}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3 py-2.5 bg-white text-base md:text-sm"
                    />
                  </div>
                )}
                {/* Hidden from people; catches bots. */}
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="hidden"
                />
                {error && <p className="text-sm font-medium text-red-700">{error}</p>}
                <button
                  type="button"
                  onClick={send}
                  disabled={busy}
                  className="w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold active:bg-emerald-800 disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Send idea"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
