"use client";

import { useMemo, useState } from "react";
import { useAssessmentData } from "@/lib/useAssessment";
import SignaturePad from "@/components/SignaturePad";
import CopySignOnLinkButton from "@/components/CopySignOnLinkButton";

export default function ReassessPage({ params }: { params: { id: string } }) {
  const { assessment, project, loading, error } = useAssessmentData(params.id);
  const [query, setQuery] = useState("");
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [whatChanged, setWhatChanged] = useState("");
  const [newHazards, setNewHazards] = useState("");
  const [newControls, setNewControls] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [newVersion, setNewVersion] = useState<number | null>(null);
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

  const submit = async (signatureData: string) => {
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
          signatureData,
        }),
      });
      const respBody = await res.json();
      if (!res.ok) {
        throw new Error(respBody.error ?? "Could not submit reassessment.");
      }
      setNewVersion(respBody.version ?? null);
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
        <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-4 text-emerald-800 font-medium space-y-2">
          <p>
            Reassessment recorded{newVersion ? ` as version ${newVersion}` : ""} — signed and
            sent to your supervisor for review.
          </p>
          <p className="font-normal text-sm">
            Anyone who already signed the original needs to sign again for this version.
          </p>
          <CopySignOnLinkButton assessmentId={params.id} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-neutral-50 px-4 py-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-neutral-900">Conditions have changed — reassess</h1>
      <p className="text-neutral-600 text-sm mt-1">
        This creates version {assessment.version + 1} of this assessment for {project.name},
        with your notes on what changed. Your team will need to sign again for this version.
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

        {workerId && whatChanged.trim() ? (
          <div className="space-y-2">
            <p className="text-sm text-neutral-700">
              Sign below to confirm and submit this reassessment.
            </p>
            <SignaturePad onCapture={submit} disabled={submitting} />
          </div>
        ) : (
          <p className="text-sm text-neutral-500 text-center">
            Enter your name and what's changed to continue to signing.
          </p>
        )}
      </div>
    </main>
  );
}
