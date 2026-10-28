"use client";

import { useMemo, useState } from "react";
import { useAssessmentData } from "@/lib/useAssessment";
import SignaturePad from "@/components/SignaturePad";
import CopySignOnLinkButton from "@/components/CopySignOnLinkButton";
import WorkerHeader from "@/components/WorkerHeader";

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

  const field =
    "w-full rounded-xl border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600";

  const frame = (body: React.ReactNode, context?: string, subtitle?: string, backHref?: string) => (
    <main className="min-h-dvh w-full min-w-0 bg-neutral-50 pb-10">
      <WorkerHeader
        context={context}
        title="Reassess"
        subtitle={subtitle ?? "Conditions have changed"}
        backHref={backHref}
        backLabel="Back"
      />
      <div className="max-w-md mx-auto px-4 py-5">{body}</div>
    </main>
  );

  if (loading)
    return frame(
      <div className="space-y-3 animate-pulse">
        <div className="h-24 bg-white rounded-2xl border border-neutral-200" />
        <div className="h-64 bg-white rounded-2xl border border-neutral-200" />
      </div>
    );
  if (error || !assessment || !project)
    return frame(
      <p className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-800">
        {error ?? "Not found."}
      </p>
    );

  const backHref = `/assess/${params.id}`;

  if (assessment.status !== "approved") {
    return frame(
      <div className="rounded-2xl bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-900 font-medium">
        Reassessment is only available for an approved assessment.
      </div>,
      project.name,
      undefined,
      backHref
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
    return frame(
      <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-5 text-emerald-900 space-y-3 text-center">
        <span className="mx-auto w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl font-bold">
          ✓
        </span>
        <p className="font-semibold">
          Reassessment recorded{newVersion ? ` as version ${newVersion}` : ""}
        </p>
        <p className="text-sm">Signed and sent to your supervisor for review.</p>
        <p className="text-sm">
          Anyone who signed the original needs to sign again for this version.
        </p>
        <div className="flex justify-center">
          <CopySignOnLinkButton assessmentId={params.id} />
        </div>
      </div>,
      project.name,
      "All done",
      `/${project.qrSlug}`
    );
  }

  return frame(
    <div className="space-y-4">
      <div className="rounded-2xl bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-900">
        This creates <strong>version {assessment.version + 1}</strong> of this JSAFE with your notes
        on what changed. Your team will need to sign again for this version.
      </div>

      <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-neutral-800 mb-1.5">Your name</label>
          <input
            type="text"
            placeholder="Search your name..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setWorkerId(null);
            }}
            className={field}
          />
          {query && !workerId && (
            <div className="mt-1 border border-neutral-200 rounded-xl divide-y divide-neutral-100 bg-white max-h-56 overflow-y-auto shadow-sm">
              {workers.map((w: any) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setWorkerId(w.id);
                    setQuery(w.name);
                  }}
                  className="w-full text-left px-4 py-3 active:bg-emerald-50"
                >
                  {w.name}
                </button>
              ))}
              {workers.length === 0 && (
                <p className="p-3 text-sm text-neutral-500">No matching worker found.</p>
              )}
            </div>
          )}
          {workerId && <p className="mt-1.5 text-xs font-semibold text-emerald-700">✓ {query}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
            What has changed?
          </label>
          <textarea
            value={whatChanged}
            onChange={(e) => setWhatChanged(e.target.value)}
            rows={3}
            className={field}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
            New hazards <span className="font-normal text-neutral-500">(if any)</span>
          </label>
          <textarea
            value={newHazards}
            onChange={(e) => setNewHazards(e.target.value)}
            rows={2}
            className={field}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
            New controls <span className="font-normal text-neutral-500">(if any)</span>
          </label>
          <textarea
            value={newControls}
            onChange={(e) => setNewControls(e.target.value)}
            rows={2}
            className={field}
          />
        </div>
      </section>

      {formError && (
        <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm font-medium text-red-800">
          {formError}
        </p>
      )}

      {workerId && whatChanged.trim() ? (
        <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 space-y-2">
          <h2 className="font-bold text-neutral-900">Sign to submit</h2>
          <p className="text-sm text-neutral-600">Sign below to confirm and send this reassessment.</p>
          <SignaturePad onCapture={submit} disabled={submitting} />
        </section>
      ) : (
        <p className="text-sm text-neutral-500 text-center">
          Enter your name and what&apos;s changed to continue to signing.
        </p>
      )}
    </div>,
    project.name,
    "Conditions have changed",
    backHref
  );
}
