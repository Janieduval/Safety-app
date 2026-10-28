"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAssessmentData } from "@/lib/useAssessment";
import SignaturePad from "@/components/SignaturePad";
import StaffShell from "@/components/StaffShell";
import AssessmentRecord from "@/components/AssessmentRecord";
import { SUPERVISOR_CHECKLIST } from "@/lib/constants";

export default function SupervisorReviewPage({ params }: { params: { id: string } }) {
  const { assessment, project, loading, error, reload } = useAssessmentData(params.id);
  const searchParams = useSearchParams();
  const fromSupervisor = searchParams.get("from") === "supervisor";
  const role = fromSupervisor ? "supervisor" : "admin";
  const backHref = fromSupervisor ? "/supervisor" : "/admin/dashboard";
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

  const shell = (title: string, subtitle: string | undefined, body: React.ReactNode, actions?: React.ReactNode) => (
    <StaffShell
      role={role}
      active={backHref}
      title={title}
      subtitle={subtitle}
      icon="check"
      backHref={backHref}
      backLabel="Dashboard"
      actions={actions}
      maxWidth="max-w-6xl"
    >
      {body}
    </StaffShell>
  );

  if (loading)
    return shell(
      "Supervisor review",
      undefined,
      <div className="space-y-3 animate-pulse">
        <div className="h-40 bg-white rounded-2xl border border-neutral-200" />
        <div className="h-64 bg-white rounded-2xl border border-neutral-200" />
      </div>
    );
  if (error || !assessment || !project)
    return shell(
      "Supervisor review",
      undefined,
      <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-800">
        {error ?? "Not found."}
      </p>
    );

  const reviews = assessment.supervisorReviews ?? [];
  const latestReview = reviews.length > 0 ? reviews[reviews.length - 1] : null;
  const alreadyReviewed = !!latestReview && assessment.status !== "awaiting_supervisor_review";
  const notReady = assessment.status !== "awaiting_supervisor_review" && !alreadyReviewed;

  const checklistComplete = SUPERVISOR_CHECKLIST.every((c) => checklist[c.key]);
  const canApprove = checklistComplete;
  const canRequestChanges = true; // changes can be requested even with an incomplete checklist
  const checkedCount = SUPERVISOR_CHECKLIST.filter((c) => checklist[c.key]).length;

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

  const field =
    "w-full rounded-xl border border-neutral-300 px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600";

  const pdfButton = (
    <a href={`/api/assessments/${assessment.id}/pdf?view=1`} target="_blank" rel="noreferrer" className="text-sm px-4 py-2 rounded-xl bg-white text-emerald-800 font-semibold border border-emerald-200 shadow-sm hover:bg-emerald-50">
      Open PDF
    </a>
  );

  // ---------- The review panel (right column on a computer) ----------
  const reviewPanel = (
    <div className="space-y-4">
      {notReady && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          This assessment is currently{" "}
          <strong className="capitalize">{assessment.status.replace(/_/g, " ")}</strong> and is not
          waiting for review right now.
        </div>
      )}

      {alreadyReviewed && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          Already reviewed by <strong>{latestReview?.supervisor?.name ?? "a supervisor"}</strong> —{" "}
          <strong className="capitalize">{latestReview?.decision?.replace(/_/g, " ")}</strong>.
        </div>
      )}

      {!notReady && !alreadyReviewed && (
        <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 md:p-5 space-y-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h2 className="font-bold text-neutral-900">Your review</h2>
          </div>

          {/* 1. Who is reviewing */}
          <div>
            <p className="text-sm font-semibold text-neutral-800 mb-1.5">1. Reviewing supervisor</p>
            <input
              type="text"
              placeholder="Search your name..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedSupervisorId(null);
              }}
              className={field}
            />
            {query && !selectedSupervisorId && (
              <div className="mt-1 border border-neutral-200 rounded-xl divide-y divide-neutral-100 bg-white max-h-48 overflow-y-auto shadow-sm">
                {availableSupervisors.map((s: any) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedSupervisorId(s.id);
                      setQuery(s.name);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-emerald-50 active:bg-emerald-50"
                  >
                    {s.name}
                  </button>
                ))}
                {availableSupervisors.length === 0 && (
                  <p className="p-3 text-sm text-neutral-500">No matching supervisor found.</p>
                )}
              </div>
            )}
            {selectedSupervisorId && (
              <p className="mt-1.5 text-xs font-semibold text-emerald-700">✓ Reviewing as {query}</p>
            )}
          </div>

          {selectedSupervisorId && (
            <>
              {/* 2. Checklist */}
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <p className="text-sm font-semibold text-neutral-800">2. Checklist</p>
                  <span className="text-xs text-neutral-500">
                    {checkedCount}/{SUPERVISOR_CHECKLIST.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {SUPERVISOR_CHECKLIST.map((c) => (
                    <label
                      key={c.key}
                      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                        checklist[c.key]
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-neutral-200 bg-white hover:border-emerald-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!checklist[c.key]}
                        onChange={(e) =>
                          setChecklist((prev) => ({ ...prev, [c.key]: e.target.checked }))
                        }
                        className="w-5 h-5 mt-0.5 flex-shrink-0 accent-emerald-700"
                      />
                      <span className="text-neutral-800 text-sm">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 3. Notes */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-neutral-800">3. Notes</p>
                <label className="block text-xs font-semibold text-neutral-600">
                  Comments (optional)
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                    className={`${field} mt-1 font-normal text-sm`}
                    placeholder="Any notes for the worker, especially if requesting changes..."
                  />
                </label>
                <label className="block text-xs font-semibold text-neutral-600">
                  Additional controls (optional)
                  <textarea
                    value={additionalControls}
                    onChange={(e) => setAdditionalControls(e.target.value)}
                    rows={3}
                    className={`${field} mt-1 font-normal text-sm`}
                  />
                </label>
              </div>

              {/* 4. Decision */}
              {!decision && (
                <div>
                  <p className="text-sm font-semibold text-neutral-800 mb-1.5">4. Decision</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setDecision("changes_required")}
                      disabled={!canRequestChanges}
                      className="flex-1 py-3 rounded-xl border-2 border-amber-500 text-amber-700 font-semibold bg-white hover:bg-amber-50 disabled:opacity-40"
                    >
                      Request changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecision("approved")}
                      disabled={!canApprove}
                      className="flex-1 py-3 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-40"
                    >
                      Approve
                    </button>
                  </div>
                  {!canApprove && (
                    <p className="text-xs text-neutral-500 mt-2 text-center">
                      Tick every checklist item to approve. You can still request changes without
                      it.
                    </p>
                  )}
                </div>
              )}

              {decision && (
                <div className="space-y-3">
                  <div
                    className={`rounded-xl px-3 py-2 text-sm font-medium ${
                      decision === "approved"
                        ? "bg-emerald-50 text-emerald-900"
                        : "bg-amber-50 text-amber-900"
                    }`}
                  >
                    {decision === "approved"
                      ? "Sign below to confirm this assessment is approved."
                      : "Sign below to confirm you are sending this assessment back for changes."}
                  </div>
                  <SignaturePad onCapture={submitDecision(decision)} disabled={submitting} />
                  <button
                    type="button"
                    onClick={() => setDecision(null)}
                    className="text-sm font-semibold text-emerald-700"
                  >
                    ← Change decision
                  </button>
                  {submitError && (
                    <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm font-medium text-red-800">
                      {submitError}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );

  return shell(
    "Supervisor review",
    `${assessment.completedByWorker?.name ?? "Worker"} · Version ${assessment.version}`,
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      {/* Read the assessment first; the review panel sits beside it on a computer, below it on a phone. */}
      <div className="min-w-0">
        <AssessmentRecord a={assessment} />
      </div>
      <div>{reviewPanel}</div>
    </div>,
    pdfButton
  );
}
