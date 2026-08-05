"use client";

import { useMemo, useState } from "react";
import { useAssessmentData } from "@/lib/useAssessment";

export default function ReassessPage({ params }: { params: { id: string } }) {
  const { assessment, project, loading, error } = useAssessmentData(params.id);
  const [query, setQuery] = useState("");
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [whatChanged, setWhatChanged] = useState("");
  const [newHazards, setNewHazards] = useState("");
  const [newControls, setNewControls] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const workers = useMemo(() => {
    if (!project) return [];
    if (!query.trim()) return project.workers;
    return project.workers.filter((w: any) => w.name.toLowerCase().includes(query.toLowerCase()));
  }, [project, query]);

  if (loading) return <p className="p-6 text-center text-neutral-500">Loading...</p>;
  if (error || !assessment || !project)
    return <p className="p-6 text-center text-red-700">{error ?? "Not found."}</p>;

  if (assessment.status !== "approved") {
    return (
      <main className="min-h-dvh bg-neutral-50 px-4 py-6 max-w-md mx-auto">
        <div className="rounded-lg bg-amber-50 border border-amber-300 p-4 text-amber-800 font-medium">
          Reassessment is only available for an approved assessment.
        </div>
      </main>
    );
  }

  const submit = async () => {
    if (!workerId || !whatChanged) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/assessments/${params.id}/reassess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initiatedByWorkerId: workerId,
          whatChanged,
          newHazards,
          newControls,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Could not submit reassessment.");
      }
      setDone(true);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <main className="min-h-dvh bg-neutral-50 px-4 py-6 max-w-md mx-auto">
        <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-4 text-emerald-800 font-medium">
          Reassessment recorded and linked to the original approved assessment. It requires
          supervisor review before work continues.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-neutral-50 px-4 py-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-neutral-900">Conditions have changed — reassess</h1>
      <p className="text-neutral-600 text-sm mt-1">
        This creates a new record linked to the original approved assessment for{" "}
        {project.name}. The original approval is kept as-is.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-1">Your name</label>
          <input
            type="text"
            placeholder="Search your name..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setWorkerId(null);
            }}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3"
          />
          {query && !workerId && (
            <div className="mt-1 border border-neutral-200 rounded-lg divide-y bg-white">
              {workers.map((w: any) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setWorkerId(w.id);
                    setQuery(w.name);
                  }}
                  className="w-full text-left px-4 py-3 active:bg-neutral-100"
                >
                  {w.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-1">
            What has changed?
          </label>
          <textarea
            value={whatChanged}
            onChange={(e) => setWhatChanged(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-1">
            New hazards (if any)
          </label>
          <textarea
            value={newHazards}
            onChange={(e) => setNewHazards(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-1">
            New controls (if any)
          </label>
          <textarea
            value={newControls}
            onChange={(e) => setNewControls(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3"
          />
        </div>

        {formError && <p className="text-red-700 text-sm font-medium">{formError}</p>}

        <button
          type="button"
          disabled={!workerId || !whatChanged || submitting}
          onClick={submit}
          className="w-full py-4 rounded-lg bg-emerald-700 text-white text-lg font-semibold disabled:opacity-40"
        >
          {submitting ? "Submitting..." : "Submit reassessment"}
        </button>
      </div>
    </main>
  );
}
