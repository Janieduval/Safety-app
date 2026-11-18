"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamItem } from "./TeamPicker";

// "My teams" on the supervisor dashboard.
// - Sites where supervisors choose their own teams (e.g. Blind Creek): every
//   team is listed, theirs are green with a tick. Tap to change, then Save teams.
// - Sites where the admin sets them (e.g. Yanco BESS): only their own teams
//   are shown, and they can't change them.

export default function SupervisorMyTeams({
  teams,
  initialTeamIds,
  canEdit = true,
}: {
  teams: TeamItem[];
  initialTeamIds: string[];
  canEdit?: boolean; // false when only the admin sets supervisors' teams
}) {
  const router = useRouter();
  const [saved, setSaved] = useState<string[]>(initialTeamIds);
  const [picked, setPicked] = useState<string[]>(initialTeamIds);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const changed = picked.slice().sort().join() !== saved.slice().sort().join();
  const myTeams = teams.filter((t) => saved.includes(t.id));

  const toggle = (id: string) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    setState("idle");
  };

  const save = async () => {
    setState("saving");
    const res = await fetch("/api/supervisor/teams", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamIds: picked }),
    }).catch(() => null);
    if (!res?.ok) return setState("error");
    const body = await res.json();
    const ids: string[] = body.teamIds ?? picked;
    setSaved(ids);
    setPicked(ids);
    setState("saved");
    router.refresh();
  };

  const chip = (on: boolean) =>
    `text-sm px-3 py-1.5 rounded-full border font-semibold ${
      on ? "bg-emerald-700 border-emerald-700 text-white" : "bg-white border-neutral-300 text-neutral-700"
    }`;

  return (
    <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4">
      <h2 className="font-bold text-neutral-900">My teams</h2>

      {canEdit ? (
        <>
          <p className="text-xs text-neutral-500 mt-0.5">Tap the teams you&apos;re responsible for.</p>
          {teams.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">No teams yet.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {teams.map((t) => (
                <button key={t.id} type="button" onClick={() => toggle(t.id)} className={chip(picked.includes(t.id))}>
                  {picked.includes(t.id) ? "✓ " : ""}
                  {t.label}
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {changed && (
              <>
                <button
                  type="button"
                  onClick={save}
                  disabled={state === "saving"}
                  className="text-sm px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold disabled:opacity-60"
                >
                  {state === "saving" ? "Saving..." : "Save teams"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPicked(saved);
                    setState("idle");
                  }}
                  className="text-sm px-4 py-2 rounded-xl border border-neutral-300 text-neutral-700 font-semibold"
                >
                  Cancel
                </button>
              </>
            )}
            {!changed && state === "saved" && <p className="text-sm text-emerald-800 font-medium">✓ Saved</p>}
            {state === "error" && <p className="text-sm text-red-700 font-medium">Couldn&apos;t save. Try again.</p>}
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-neutral-500 mt-0.5">The teams you&apos;re responsible for. They&apos;re set by the admin.</p>
          {myTeams.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {myTeams.map((t) => (
                <span key={t.id} className={chip(true)}>
                  ✓ {t.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-neutral-500">No teams yet. Ask the admin to set your teams.</p>
          )}
        </>
      )}
    </section>
  );
}
