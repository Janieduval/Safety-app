"use client";

import { useEffect, useState } from "react";

export type TeamItem = { id: string; label: string };

// Tap teams on/off, then Save. Used by supervisors ("My teams") and by the
// admin on the People page.
export default function TeamPicker({
  teams,
  selected,
  onSave,
  onCancel,
}: {
  teams: TeamItem[];
  selected: string[];
  onSave: (teamIds: string[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [picked, setPicked] = useState<string[]>(selected);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(picked);
    } catch (e: any) {
      setError(e?.message ?? "Could not save. Try again.");
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-xs text-neutral-500 mb-2">Tap the teams you're responsible for.</p>
      <div className="flex flex-wrap gap-1.5">
        {teams.map((t) => {
          const on = picked.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              className={`text-sm px-3 py-1.5 rounded-full border font-medium ${
                on
                  ? "bg-emerald-700 border-emerald-700 text-white"
                  : "bg-white border-neutral-300 text-neutral-700 hover:border-emerald-400"
              }`}
            >
              {on ? "✓ " : ""}
              {t.label}
            </button>
          );
        })}
        {teams.length === 0 && <p className="text-sm text-neutral-500">No teams set up yet.</p>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="text-sm px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save teams"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="text-sm px-4 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-700 font-medium"
        >
          Cancel
        </button>
        {error && <p className="text-xs text-red-700 font-medium">{error}</p>}
      </div>
    </div>
  );
}

// Admin version: loads a supervisor's teams and saves them.
export function AdminSupervisorTeams({
  supervisorId,
  onDone,
}: {
  supervisorId: string;
  onDone: (saved: boolean) => void;
}) {
  const [data, setData] = useState<{ teams: TeamItem[]; teamIds: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/supervisors/${supervisorId}/teams`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError("Could not load the teams. Try again."));
  }, [supervisorId]);

  if (error) return <p className="text-xs text-red-700 font-medium">{error}</p>;
  if (!data) return <p className="text-xs text-neutral-500">Loading teams...</p>;

  return (
    <TeamPicker
      teams={data.teams}
      selected={data.teamIds}
      onCancel={() => onDone(false)}
      onSave={async (teamIds) => {
        const res = await fetch(`/api/admin/supervisors/${supervisorId}/teams`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamIds }),
        });
        if (!res.ok) throw new Error("Could not save the teams.");
        onDone(true);
      }}
    />
  );
}
