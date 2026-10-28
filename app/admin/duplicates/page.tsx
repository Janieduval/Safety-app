"use client";

import { useCallback, useEffect, useState } from "react";
import StaffShell, { StaffIcon } from "@/components/StaffShell";

type Kind = "worker" | "supervisor";
type Project = { id: string; name: string };
type Person = {
  id: string;
  name: string;
  needsReview: boolean;
  createdAt: string;
  assessments: number;
  signOns: number;
  reviews: number;
};
type Pair = { reason: string; a: Person; b: Person };
type Confirming = { pairKey: string; keep: Person; remove: Person };

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function describe(person: Person, kind: Kind) {
  if (kind === "worker") {
    return `${plural(person.assessments, "assessment")} started · ${plural(person.signOns, "signature")}`;
  }
  return plural(person.reviews, "review");
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function DuplicatesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [kind, setKind] = useState<Kind>("worker");
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Confirming | null>(null);

  useEffect(() => {
    fetch("/api/admin/projects")
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load projects (error ${res.status}).`);
        return res.json();
      })
      .then((data) => {
        const list: Project[] = data.projects ?? [];
        setProjects(list);
        if (list.length > 0) setProjectId(list[0].id);
        else setLoading(false);
      })
      .catch((e: any) => {
        setError(e.message ?? "Could not load projects.");
        setLoading(false);
      });
  }, []);

  const loadPairs = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/duplicates?projectId=${projectId}&kind=${kind}`);
      if (!res.ok) throw new Error(`Could not load suggestions (error ${res.status}).`);
      const data = await res.json();
      setPairs(data.pairs ?? []);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [projectId, kind]);

  useEffect(() => {
    loadPairs();
  }, [loadPairs]);

  const chooseKind = (next: Kind) => {
    setKind(next);
    setNotice(null);
    setError(null);
    setConfirming(null);
  };

  const merge = async (keep: Person, remove: Person) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "merge", kind, keepId: keep.id, removeId: remove.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not merge these two.");
      let message = `Merged "${remove.name}" into "${keep.name}".`;
      if (kind === "worker") {
        message += ` Moved ${plural(body.assessmentsMoved ?? 0, "assessment")} and ${plural(body.signaturesMoved ?? 0, "signature")}.`;
        if ((body.duplicateSignaturesDropped ?? 0) > 0) {
          message += ` ${plural(body.duplicateSignaturesDropped, "duplicate signature")} for the same version was not copied across.`;
        }
      } else {
        message += ` Moved ${plural(body.reviewsMoved ?? 0, "review")}.`;
      }
      setNotice(message);
      setConfirming(null);
      await loadPairs();
    } catch (e: any) {
      setError(e.message ?? "Could not merge these two.");
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async (pair: Pair) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss", kind, idA: pair.a.id, idB: pair.b.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not save that.");
      setNotice(`Okay, "${pair.a.name}" and "${pair.b.name}" won't be suggested again.`);
      setConfirming(null);
      await loadPairs();
    } catch (e: any) {
      setError(e.message ?? "Could not save that.");
    } finally {
      setBusy(false);
    }
  };

  const personBox = (person: Pair["a"], other: Person, pairKey: string) => (
    <div className="flex-1 min-w-0 rounded-xl border border-neutral-200 bg-neutral-50 p-3 flex flex-col">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 ring-1 ring-emerald-100">
          {initials(person.name)}
        </span>
        <p className="font-semibold text-neutral-900 leading-tight break-words min-w-0">{person.name}</p>
      </div>
      {person.needsReview && (
        <span className="mt-2 self-start text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
          New — unverified
        </span>
      )}
      <p className="text-xs text-neutral-500 mt-2">
        Added {new Date(person.createdAt).toLocaleDateString("en-AU", { timeZone: "Australia/Sydney" })}
      </p>
      <p className="text-xs text-neutral-600 mt-0.5">{describe(person, kind)}</p>
      <div className="mt-auto pt-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirming({ pairKey, keep: person, remove: other })}
          className="w-full py-2 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-40"
        >
          Keep this one
        </button>
      </div>
    </div>
  );

  return (
    <StaffShell
      role="admin"
      active="/admin/people"
      title="Duplicates"
      subtitle="Names that look alike"
      icon="copy"
      backHref="/admin/people"
      backLabel="People"
    >
      <p className="text-sm text-neutral-600 mb-5 leading-relaxed">
        These names look alike. Pick the one to keep and everything attached to the other moves
        across, or say they aren&apos;t the same person.
      </p>

      {projects.length > 1 && (
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1.5">
            Project
          </label>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setNotice(null);
              setConfirming(null);
            }}
            className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Workers / Supervisors switch */}
      <div className="flex w-full md:w-auto md:inline-flex p-1 mb-5 rounded-full bg-white border border-neutral-200 shadow-sm">
        {(["worker", "supervisor"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => chooseKind(k)}
            className={`flex-1 md:flex-none md:px-6 py-2 rounded-full text-sm font-semibold transition-colors ${
              kind === k ? "bg-emerald-700 text-white shadow" : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {k === "worker" ? "Workers" : "Supervisors"}
          </button>
        ))}
      </div>

      {notice && (
        <div className="mb-4 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[0, 1].map((i) => (
            <div key={i} className="h-48 bg-white rounded-2xl border border-neutral-200" />
          ))}
        </div>
      ) : pairs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 px-4 py-8 text-center">
          <span className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <StaffIcon name="check" />
          </span>
          <p className="mt-3 text-sm font-semibold text-neutral-800">
            All clear — no possible duplicates for {kind === "worker" ? "workers" : "supervisors"}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pairs.map((pair) => {
            const key = `${pair.a.id}:${pair.b.id}`;
            const isConfirming = confirming && confirming.pairKey === key;
            return (
              <div key={key} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 md:p-5">
                <p className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 mb-3">
                  {pair.reason}
                </p>
                <div className="flex gap-3">
                  {personBox(pair.a, pair.b, key)}
                  {personBox(pair.b, pair.a, key)}
                </div>

                {isConfirming && confirming && (
                  <div className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 p-3">
                    <p className="text-sm text-red-900 font-semibold">
                      Merge &quot;{confirming.remove.name}&quot; into &quot;{confirming.keep.name}&quot;?
                    </p>
                    <p className="text-xs text-red-800 mt-1">
                      Everything &quot;{confirming.remove.name}&quot; has done (
                      {describe(confirming.remove, kind)}) moves to &quot;{confirming.keep.name}&quot;,
                      and &quot;{confirming.remove.name}&quot; is removed from the list. This can&apos;t
                      be undone.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => merge(confirming.keep, confirming.remove)}
                        className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40"
                      >
                        {busy ? "Merging..." : "Yes, merge"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirming(null)}
                        className="flex-1 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-700 text-sm font-semibold disabled:opacity-40"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {!isConfirming && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => dismiss(pair)}
                    className="mt-3 w-full py-2 rounded-xl border border-neutral-300 bg-white text-neutral-700 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-40"
                  >
                    Not the same person
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </StaffShell>
  );
}
