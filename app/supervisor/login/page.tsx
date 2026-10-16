"use client";

import { useState } from "react";

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
  );
}

export default function SupervisorLoginPage() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/supervisor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not log in.");
      }
      window.location.href = "/supervisor";
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !submitting && !!name.trim() && !!pin;

  return (
    <main
      className="min-h-dvh w-full min-w-0 flex items-center justify-center px-5 py-10"
      style={{ background: "linear-gradient(160deg, #10b981 0%, #047857 50%, #064e3b 100%)" }}
    >
      <div className="w-full max-w-sm">
        {/* JSAFE brand */}
        <div className="flex flex-col items-center text-center text-white mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192_2.png"
            alt=""
            className="w-20 h-20 rounded-3xl shadow-xl ring-4 ring-white/25"
          />
          <p className="mt-4 text-4xl font-extrabold tracking-wide">JSAFE</p>
          <p className="mt-2 text-base font-semibold text-emerald-50">
            Take 5. Work safe. Go home safe.
          </p>
        </div>

        {/* Login card */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) submit();
          }}
          className="bg-white rounded-3xl shadow-2xl p-6 space-y-4"
        >
          <div>
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Supervisor access
            </span>
            <h1 className="mt-2 text-xl font-bold text-neutral-900">Supervisor login</h1>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-neutral-700 mb-1">
              Full name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="username"
              autoCapitalize="words"
              placeholder="e.g. Sam Taylor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
            />
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm font-semibold text-neutral-700 mb-1">
              PIN
            </label>
            <div className="relative">
              <input
                id="pin"
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                autoComplete="current-password"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-xl border border-neutral-300 pl-4 pr-12 py-3 tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              />
              <button
                type="button"
                onClick={() => setShowPin((s) => !s)}
                aria-label={showPin ? "Hide PIN" : "Show PIN"}
                className="absolute inset-y-0 right-0 flex items-center px-3.5 text-neutral-500 active:text-emerald-700"
              >
                <EyeIcon open={showPin} />
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3.5 rounded-xl bg-emerald-700 text-white text-base font-semibold shadow-md active:bg-emerald-800 disabled:opacity-40"
          >
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-emerald-50/80">
          Daily Task Safety Awareness
        </p>
      </div>
    </main>
  );
}
