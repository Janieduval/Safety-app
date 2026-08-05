"use client";

import { useMemo, useState } from "react";
import { useAssessmentData } from "@/lib/useAssessment";
import SignaturePad from "@/components/SignaturePad";

const CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: "taskUnderstood", label: "The task has been clearly understood." },
  { key: "hazardsAppropriate", label: "The identified hazards are appropriate for the task." },
  { key: "controlsSuitable", label: "Suitable controls have been implemented." },
  {
    key: "workersCompetentFit",
    label: "The workers are competent and fit to safely perform the task.",
  },
  {
    key: "additionalHazardsDiscussed",
    label: "Any additional hazards or controls have been discussed.",
  },
  { key: "stopWorkResolved", label: "Any stop-work answers have been resolved." },
  { key: "highRiskReviewed", label: "Any High or Extreme risks have been reviewed." },
  { key: "permitsConfirmed", label: "Any required permits have been confirmed." },
];

export default function SupervisorReviewPage({ params }: { params: { id: string } }) {
  const { assessment, project, loading, error, reload } = useAssessmentData(params.id);
  const [supervisorQuery, setSupervisorQuery] = useState("");
  const [supervisorId, setSupervisorId] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState("");
  const [additionalControls, setAdditionalControls] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);

  const supervisors = useMemo(() => {
    if (!project) return [];
    if (!supervisorQuery.trim()) return project.supervisors;
    return project.supervisors.filter((s: any) =>
      s.name.toLowerCase().includes(supervisorQuery.toLowerCase())
    );
  }, [project, supervisorQuery]);

  if (loading) return <p className="p-6 text-center text-neutral-500">Loading...</p>;
  if (error || !assessment || !project)
    return <p className="p-6 text-center text-red-700">{error ?? "Not found."}</p>;

  const flaggedHighRisk = assessment.hazardResponses.some((r: any) =>
    r.cards?.some((c: any) => c.residualRisk === "high" || c.residualRisk === "extreme")
  );
  const flaggedNewHazard = assessment.newHazardFlag?.present;
  const flaggedAccess = assessment.accessCheck?.safe === false;
  const flaggedStopWork = assessment.step1Responses.some((r: any) => r.answer === false);

  const decide = async (decision: "approved" | "changes_required", signatureData: string) => {
    if (!supervisorId) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/assessments/${params.id}/supervisor-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supervisorId,
          checklist,
          comments,
          additionalControls,
          decision,
          signatureData,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFormError(body.error ?? "Could not submit review.");
        return;
      }
      reload();
    } finally {
      setSubmitting(false);
    }
  };

  if (assessment.status === "approved") {
    return (
      <main className="min-h-dvh bg-neutral-50 px-4 py-6 max-w-md mx-auto">
        <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-4 text-emerald-800 font-medium">
          This assessment has been approved.
        </div>
      </main>
    );
  }

  if (assessment.status !== "awaiting_supervisor_review") {
    return (
      <main className="min-h-dvh bg-neutral-50 px-4 py-6 max-w-md mx-auto">
        <div className="rounded-lg bg-amber-50 border border-amber-300 p-4 text-amber-800 font-medium">
          This assessment is currently "{assessment.status.replace(/_/g, " ")}" and is not
          awaiting review.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-neutral-50 px-4 py-6 max-w-md mx-auto pb-10">
      <p className="text-sm font-medium text-emerald-700 uppercase tracking-wide">
        {project.name}
      </p>
      <h1 className="text-xl font-bold text-neutral-900 mt-1">Supervisor review</h1>
      <p className="text-neutral-600 text-sm mt-1">
        Completed by {assessment.completedByWorker?.name} ·{" "}
        {new Date(assessment.dateTime).toLocaleString("en-AU")}
      </p>

      {(flaggedStopWork || flaggedAccess || flaggedHighRisk || flaggedNewHazard) && (
        <div className="mt-4 rounded-lg border-2 border-red-700 bg-red-50 p-4 space-y-1">
          <p className="font-semibold text-red-800">Flagged for review:</p>
          <ul className="list-disc list-inside text-sm text-red-800">
            {flaggedStopWork && <li>One or more Step 1 answers were "No"</li>}
            {flaggedAccess && <li>Access route was flagged unsafe</li>}
            {flaggedHighRisk && <li>A hazard has High or Extreme residual risk</li>}
            {flaggedNewHazard && <li>A new hazard outside current SWMS was identified</li>}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <h2 className="font-semibold text-neutral-900 mb-2">Supervisor checklist</h2>
        <div className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => (
            <label
              key={item.key}
              className="flex items-start gap-3 border border-neutral-200 rounded-lg p-3 bg-white"
            >
              <input
                type="checkbox"
                checked={!!checklist[item.key]}
                onChange={(e) =>
                  setChecklist((prev) => ({ ...prev, [item.key]: e.target.checked }))
                }
                className="w-6 h-6 mt-0.5 flex-shrink-0"
              />
              <span className="text-neutral-900">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-1">
            Supervisor comments
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-1">
            Additional controls (if required)
          </label>
          <textarea
            value={additionalControls}
            onChange={(e) => setAdditionalControls(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
        </div>
      </div>

      <div className="mt-5">
        <label className="block text-sm font-semibold text-neutral-700 mb-1">
          Supervisor name
        </label>
        <input
          type="text"
          placeholder="Search supervisor..."
          value={supervisorQuery}
          onChange={(e) => {
            setSupervisorQuery(e.target.value);
            setSupervisorId(null);
          }}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3"
        />
        {supervisorQuery && !supervisorId && (
          <div className="mt-1 border border-neutral-200 rounded-lg divide-y bg-white">
            {supervisors.map((s: any) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSupervisorId(s.id);
                  setSupervisorQuery(s.name);
                }}
                className="w-full text-left px-4 py-3 active:bg-neutral-100"
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {supervisorId && (
        <div className="mt-5">
          <h2 className="font-semibold text-neutral-900 mb-2">Signature</h2>
          <SignaturePad disabled={submitting} onCapture={(dataUrl) => setPendingSignature(dataUrl)} />
          {pendingSignature && (
            <p className="text-sm text-emerald-700 font-medium mt-2">Signature captured.</p>
          )}
          <div className="flex gap-3 mt-3">
            <button
              type="button"
              disabled={submitting || !pendingSignature}
              onClick={() => pendingSignature && decide("changes_required", pendingSignature)}
              className="flex-1 py-3 rounded-lg border-2 border-amber-600 text-amber-700 font-semibold disabled:opacity-40"
            >
              Return for changes
            </button>
            <button
              type="button"
              disabled={submitting || !pendingSignature}
              onClick={() => pendingSignature && decide("approved", pendingSignature)}
              className="flex-1 py-3 rounded-lg bg-emerald-700 text-white font-semibold disabled:opacity-40"
            >
              Approve
            </button>
          </div>
        </div>
      )}

      {formError && <p className="text-red-700 text-sm font-medium mt-3">{formError}</p>}
    </main>
  );
}
