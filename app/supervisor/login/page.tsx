"use client";

import { useState } from "react";

export default function SupervisorLoginPage() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
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

  return (
    <main className="min-h-dvh bg-neutral-50 px-4 py-6 flex items-center justify-center">
      <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
        <h1 className="text-xl font-bold text-neutral-900">Supervisor login</h1>
        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-1">Full name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-1">PIN</label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3"
          />
        </div>
        {error && <p className="text-red-700 text-sm font-medium">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !name.trim() || !pin}
          className="w-full py-3 rounded-lg bg-emerald-700 text-white font-semibold disabled:opacity-40"
        >
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </div>
    </main>
  );
}
