"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Control centre owner login.
export default function ControlLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/control/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      router.push("/control");
      router.refresh();
    } else {
      const data = await res?.json().catch(() => ({}));
      setError(data?.error ?? "No connection. Try again.");
    }
  };

  return (
    <main
      className="min-h-dvh w-full flex items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 55%, #064e3b 100%)" }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192_2.png" alt="" className="w-16 h-16 mx-auto rounded-2xl shadow-lg ring-2 ring-white/30" />
          <p className="mt-3 text-2xl font-extrabold tracking-wide">JSAFE</p>
          <p className="text-sm text-emerald-50/90">Control centre</p>
        </div>
        <form onSubmit={submit} className="mt-6 bg-white rounded-2xl shadow-xl p-5 space-y-3">
          <div>
            <label className="text-sm font-semibold text-neutral-800">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-base" />
          </div>
          <div>
            <label className="text-sm font-semibold text-neutral-800">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-base" />
          </div>
          {error && <p className="text-sm font-medium text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold disabled:opacity-60">
            {busy ? "Logging in…" : "Log in"}
          </button>
        </form>
      </div>
    </main>
  );
}
