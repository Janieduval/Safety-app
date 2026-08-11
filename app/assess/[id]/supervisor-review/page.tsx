"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAssessmentData } from "@/lib/useAssessment";
import SignaturePad from "@/components/SignaturePad";
import { SUPERVISOR_CHECKLIST } from "@/lib/constants";

export default function SupervisorReviewPage({ params }: { params: { id: string } }) {
  const { assessment, project, loading, error, reload } = useAssessmentData(params.id);
  const [query, setQuery] = useState("");
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState("");
  const [additionalControls, setAdditionalControls] = useState("");
  const [decision, setDecision] = useState<"approved" | "changes_required" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const availableSupervisors = useMemo(() => {
    if (!project) return [];
    if (!query.trim()) return project.supervisors;
    return project.supervisors.filter((s: any) =>
      s.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [project, query]);

  if (loading) return <p className="p-6 text-center text-neutral-500">Loading...</p>;
  if (error || !assessment || !project)
    return <p className="p-6 text-center text-red-700">{error ?? "Not found."}</p>;

  const reviews = assessment.supervisorReviews ?? [];
  const latestReview = reviews.length > 0 ? reviews[reviews.length - 1] : null;
  const alreadyReviewed = !!latestReview && assessment.status !== "awaiting_supervisor_review";
  const notReady = assessment.status !== "awaiting_supervisor_review" && !alreadyReviewed;

  const checklistComplete = SUPERVISOR_CHECKLIST.every((c) => checklist[c.key]);
  const canApprove = checklistComplete;
  const canRequestChanges = true; // changes can be requested even with an incomplete checklist

  const submitDecision = (finalDecision: "approved" | "changes_required") => async (dataUrl: string) => {
    if (!selectedSupervisorId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/assessments/${params.id}/supervisor-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supervisorId: selectedSupervisorId,
          checklist,
          comments,
          additionalControls,
          decision: finalDecision,
          signatureData: dataUrl,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not submit the review.");
      }
      await reload();
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-neutral-50 px-4 py-6 max-w-md mx-auto pb-16">
      <p className="text-sm font-medium text-emerald-700 uppercase tracking-wide">
        {project.name}
      </p>
      <h1 className="text-xl font-bold text-neutral-900 mt-1">Supervisor review</h1>
      <p className="text-neutral-600 text-sm mt-1">
        Version {assessment.version} &middot; Completed by {assessment.completedByWorker?.name}
      </p>

      
        <a href={`/api/assessments/${assessment.id}/pdf`}
        target="_blank"
        rel="noreferrer"
        className="inline-block mt-3 text-sm text-emerald-700 font-medium underline decoration-dotted"
      >
        Download a PDF record of this assessment
      </a>
        

      {reviews.length > 1 && (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-3">
          <p className="text-xs font-semibold text-neutral-700 mb-1">Previous versions</p>
          <ul className="text-xs text-neutral-600 space-y-1">
            {reviews.slice(0, -1).map((r: any) => (
              <li key={r.id}>
                Version {r.version} — {r.decision.replace(/_/g, " ")} by {r.supervisor?.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {notReady && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          This assessment is currently <strong>{assessment.status.replace(/_/g, " ")}</strong> and
          is not awaiting review right now.
        </div>
      )}

      {alreadyReviewed && (
        <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          This assessment was already reviewed by{" "}
          {latestReview?.supervisor?.name ?? "a supervisor"} — decision:{" "}
          <strong>{latestReview?.decision?.replace(/_/g, " ")}</strong>.
        </div>
      )}

      {!notReady && !alreadyReviewed && (
        <>
          <div className="mt-6">
            <h2 className="font-semibold text-neutral-900 mb-2">Reviewing supervisor</h2>
            <input
              type="text"
              placeholder="Search your name..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedSupervisorId(null);
              }}
              className="w-full rounded-lg border border-neutral-300 px-4 py-3"
            />
            {query && !selectedSupervisorId && (
              <div className="mt-1 border border-neutral-200 rounded-lg divide-y bg-white max-h-48 overflow-y-auto">
                {availableSupervisors.map((s: any) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedSupervisorId(s.id);
                      setQuery(s.name);
                    }}
                    className="w-full text-left px-4 py-3 active:bg-neutral-100"
                  >
                    {s.name}
                  </button>
                ))}
                {availableSupervisors.length === 0 && (
                  <p className="p-3 text-sm text-neutral-500">No matching supervisor found.</p>
                )}
              </div>
            )}
          </div>

          {selectedSupervisorId && (
            <>
              <div className="mt-6 space-y-3">
                <h2 className="font-semibold text-neutral-900">Checklist</h2>
                {SUPERVISOR_CHECKLIST.map((c) => (
                  <label
                    key={c.key}
                    className="flex items-start gap-3 border border-neutral-200 rounded-lg p-3 bg-white"
                  >
                    <input
                      type="checkbox"
                      checked={!!checklist[c.key]}
                      onChange={(e) =>
                        setChecklist((prev) => ({ ...prev, [c.key]: e.target.checked }))
                      }
                      className="w-5 h-5 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-neutral-800 text-sm">{c.label}</span>
                  </label>
                ))}
              </div>

              <div className="mt-6 space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">
                    Comments (optional)
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-neutral-300 px-4 py-3"
                    placeholder="Any notes for the worker, especially if requesting changes..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">
                    Additional controls (optional)
                  </label>
                  <textarea
                    value={additionalControls}
                    onChange={(e) => setAdditionalControls(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-neutral-300 px-4 py-3"
                  />
                </div>
              </div>

              {!decision && (
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDecision("changes_required")}
                    disabled={!canRequestChanges}
                    className="flex-1 py-3 rounded-lg border-2 border-amber-600 text-amber-700 font-semibold disabled:opacity-40"
                  >
                    Request changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision("approved")}
                    disabled={!canApprove}
                    className="flex-1 py-3 rounded-lg bg-emerald-700 text-white font-semibold disabled:opacity-40"
                  >
                    Approve
                  </button>
                </div>
              )}
              {!canApprove && !decision && (
                <p className="text-xs text-neutral-500 mt-2 text-center">
                  All checklist items must be confirmed to approve. You can still request changes
                  without completing the checklist.
                </p>
              )}

              {decision && (
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-neutral-700">
                    {decision === "approved"
                      ? "Sign below to confirm this assessment is approved."
                      : "Sign below to confirm you are sending this assessment back for changes."}
                  </p>
                  <SignaturePad onCapture={submitDecision(decision)} disabled={submitting} />
                  <button
                    type="button"
                    onClick={() => setDecision(null)}
                    className="text-sm text-neutral-600 underline decoration-dotted"
                  >
                    Change decision
                  </button>
                  {submitError && (
                    <p className="text-red-700 text-sm font-medium">{submitError}</p>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      <div className="mt-8 pt-5 border-t border-neutral-200">
        <Link
          href="/admin/dashboard"
          className="block text-center py-3 rounded-lg border border-neutral-400 text-neutral-700 font-medium"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
