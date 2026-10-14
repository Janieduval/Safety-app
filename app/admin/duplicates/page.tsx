"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

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
    <div className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <p className="font-semibold text-neutral-900">
        {person.name}
        {person.needsReview && (
          <span className="ml-2 text-xs text-amber-700 font-semibold">NEW — UNVERIFIED</span>
        )}
      </p>
      <p className="text-xs text-neutral-500 mt-1">
        Added {new Date(person.createdAt).toLocaleDateString("en-AU", { timeZone: "Australia/Sydney" })}
      </p>
      <p className="text-xs text-neutral-600 mt-1">{describe(person, kind)}</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => setConfirming({ pairKey, keep: person, remove: other })}
        className="mt-3 w-full py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium disabled:opacity-40"
      >
        Keep this one
      </button>
    </div>
  );

  return (
    <main className="min-h-dvh bg-neutral-50 px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-neutral-900">Possible duplicates</h1>
        <Link href="/admin/people" className="text-sm text-emerald-700 font-medium">
          ← People
        </Link>
      </div>

      <p className="text-sm text-neutral-600 mb-4">
        These names look alike. Pick the one to keep and everything attached to the other moves
        across, or say they aren't the same person.
      </p>

      {projects.length > 1 && (
        <div className="mb-4">
          <label className="block text-sm font-semibold text-neutral-700 mb-1">Project</label>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setNotice(null);
              setConfirming(null);
            }}
            className="w-full rounded-lg border border-neutral-300 px-4 py-2 bg-white"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => chooseKind("worker")}
          className={`px-4 py-2 rounded-full text-sm font-medium border ${
            kind === "worker"
              ? "bg-neutral-900 text-white border-neutral-900"
              : "bg-white text-neutral-700 border-neutral-300"
          }`}
        >
          Workers
        </button>
        <button
          type="button"
          onClick={() => chooseKind("supervisor")}
          className={`px-4 py-2 rounded-full text-sm font-medium border ${
            kind === "supervisor"
              ? "bg-neutral-900 text-white border-neutral-900"
              : "bg-white text-neutral-700 border-neutral-300"
          }`}
        >
          Supervisors
        </button>
      </div>

      {notice && (
        <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Looking for duplicates...</p>
      ) : pairs.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No possible duplicates found for {kind === "worker" ? "workers" : "supervisors"}.
        </p>
      ) : (
        <div className="space-y-4">
          {pairs.map((pair) => {
            const key = `${pair.a.id}:${pair.b.id}`;
            const isConfirming = confirming && confirming.pairKey === key;
            return (
              <div key={key} className="bg-white border border-neutral-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-amber-700 mb-3">{pair.reason}</p>
                <div className="flex gap-3">
                  {personBox(pair.a, pair.b, key)}
                  {personBox(pair.b, pair.a, key)}
                </div>

                {isConfirming && confirming && (
                  <div className="mt-3 rounded-lg border-2 border-red-300 bg-red-50 p-3">
                    <p className="text-sm text-red-900 font-medium">
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
                        className="flex-1 py-2 rounded-lg bg-red-700 text-white text-sm font-medium disabled:opacity-40"
                      >
                        {busy ? "Merging..." : "Yes, merge"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirming(null)}
                        className="flex-1 py-2 rounded-lg border border-neutral-400 bg-white text-neutral-700 text-sm font-medium disabled:opacity-40"
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
                    className="mt-3 w-full py-2 rounded-lg border border-neutral-300 text-neutral-700 text-sm font-medium disabled:opacity-40"
                  >
                    Not a duplicate
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
