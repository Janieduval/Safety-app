"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAssessmentData } from "@/lib/useAssessment";
import SignaturePad from "@/components/SignaturePad";
import { SIGNON_CONFIRMATION_TEXT } from "@/lib/constants";

const STATUS_MESSAGES: Record<string, { text: string; tone: "info" | "success" | "warning" }> = {
  draft: {
    text: "This assessment hasn't been submitted yet — go back and finish it before team members sign on.",
    tone: "warning",
  },
  awaiting_supervisor_review: {
    text: "This assessment has already been submitted and is awaiting supervisor review. You don't need to do anything further here — just add team members' signatures below as needed.",
    tone: "info",
  },
  changes_required: {
    text: "A supervisor has asked for changes to this assessment. The person who completed it will need to go back and update it before it can be resubmitted.",
    tone: "warning",
  },
  approved: {
    text: "This assessment has been approved by a supervisor. Team members can still add their signature below if they haven't already.",
    tone: "success",
  },
  archived: {
    text: "This assessment has been archived.",
    tone: "warning",
  },
};

function StatusBanner({ status }: { status: string }) {
  const msg = STATUS_MESSAGES[status];
  if (!msg) return null;
  const toneClasses = {
    info: "bg-blue-50 border-blue-300 text-blue-800",
    success: "bg-emerald-50 border-emerald-300 text-emerald-800",
    warning: "bg-amber-50 border-amber-300 text-amber-800",
  }[msg.tone];
  return (
    <div className={`mt-4 rounded-lg border p-4 text-sm font-medium ${toneClasses}`}>
      {msg.text}
    </div>
  );
}

export default function TeamSignOnPage({ params }: { params: { id: string } }) {
  const { assessment, project, loading, error, reloadAssessment } = useAssessmentData(params.id);
  const [query, setQuery] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  const alreadySignedIds = useMemo(
    () => new Set(assessment?.signOns?.map((s: any) => s.workerId) ?? []),
    [assessment]
  );

  const availableWorkers = useMemo(() => {
    if (!project) return [];
    const list = project.workers.filter((w: any) => !alreadySignedIds.has(w.id));
    if (!query.trim()) return list;
    return list.filter((w: any) => w.name.toLowerCase().includes(query.toLowerCase()));
  }, [project, query, alreadySignedIds]);

  const exactMatchExists = useMemo(
    () => availableWorkers.some((w: any) => w.name.toLowerCase() === query.trim().toLowerCase()),
    [availableWorkers, query]
  );

  if (loading) return <p className="p-6 text-center text-neutral-500">Loading...</p>;
  if (error || !assessment || !project)
    return <p className="p-6 text-center text-red-700">{error ?? "Not found."}</p>;

  const addNewWorker = async () => {
    const trimmedName = query.trim();
    if (!trimmedName) return;
    setAddingNew(true);
    setSignError(null);
    try {
      const res = await fetch("/api/workers/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, name: trimmedName }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not add you as a new worker.");
      }
      const { worker } = await res.json();
      await reloadAssessment();
      setSelectedWorkerId(worker.id);
      setQuery(worker.name);
    } catch (e: any) {
      setSignError(e.message);
    } finally {
      setAddingNew(false);
    }
  };

  const capture = async (dataUrl: string) => {
    if (!selectedWorkerId) return;
    setSaving(true);
    setSignError(null);
    try {
      const res = await fetch(`/api/assessments/${params.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: selectedWorkerId, signatureData: dataUrl }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Could not sign.");
      }
      setSelectedWorkerId(null);
      setQuery("");
      setConfirmed(false);
      await reloadAssessment();
    } catch (e: any) {
      setSignError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-dvh bg-neutral-50 px-4 py-6 max-w-md mx-auto">
      <p className="text-sm font-medium text-emerald-700 uppercase tracking-wide">
        {project.name}
      </p>
      <h1 className="text-xl font-bold text-neutral-900 mt-1">Team sign-on</h1>
      <p className="text-neutral-600 text-sm mt-1">
        {assessment.signOns.length} team member{assessment.signOns.length === 1 ? "" : "s"}{" "}
        signed on
      </p>

      <StatusBanner status={assessment.status} />

      
        href={`/api/assessments/${assessment.id}/pdf`}
        target="_blank"
        rel="noreferrer"
        className="inline-block mt-3 text-sm text-emerald-700 font-medium underline decoration-dotted"
      >
        Download a PDF record of this assessment
      </a>

      <div className="mt-4 space-y-2">
        {assessment.signOns.map((s: any) => (
          <div key={s.id} className="flex items-center justify-between border border-neutral-200 rounded-lg p-3 bg-white">
            <span className="font-medium text-neutral-800">
              {s.worker.name}
              {s.isPrimary && <span className="ml-2 text-xs text-emerald-700 font-semibold">PRIMARY</span>}
            </span>
            <span className="text-xs text-neutral-500">
              {new Date(s.signedAt).toLocaleTimeString("en-AU")}
            </span>
          </div>
        ))}
      </div>

      {assessment.status !== "draft" && (
        <div className="mt-6 border-t border-neutral-200 pt-5">
          <h2 className="font-semibold text-neutral-900 mb-2">Add your signature</h2>
          <input
            type="text"
            placeholder="Search your name..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedWorkerId(null);
            }}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3"
          />
          {query && !selectedWorkerId && (
            <div className="mt-1 border border-neutral-200 rounded-lg divide-y bg-white max-h-48 overflow-y-auto">
              {availableWorkers.map((w: any) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setSelectedWorkerId(w.id);
                    setQuery(w.name);
                  }}
                  className="w-full text-left px-4 py-3 active:bg-neutral-100"
                >
                  {w.name}
                </button>
              ))}
              {availableWorkers.length === 0 && (
                <p className="p-3 text-sm text-neutral-500">No matching worker found.</p>
              )}
              {!exactMatchExists && query.trim().length > 1 && (
                <button
                  type="button"
                  onClick={addNewWorker}
                  disabled={addingNew}
                  className="w-full text-left px-4 py-3 text-emerald-700 font-medium active:bg-emerald-50 disabled:opacity-50"
                >
                  {addingNew ? "Adding..." : `+ Add "${query.trim()}" as a new worker`}
                </button>
              )}
            </div>
          )}

          {selectedWorkerId && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-neutral-700">{SIGNON_CONFIRMATION_TEXT}</p>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="w-5 h-5"
                />
                I confirm I have reviewed and understood this assessment
              </label>
              {confirmed && <SignaturePad onCapture={capture} disabled={saving} />}
              {signError && <p className="text-red-700 text-sm font-medium">{signError}</p>}
            </div>
          )}
        </div>
      )}

      <div className="mt-8 pt-5 border-t border-neutral-200">
        <p className="text-sm text-neutral-600 mb-3">
          Once everyone who needs to has signed on, you're done on this device — a supervisor
          will review the assessment separately.
        </p>
        <Link
          href={`/${project.qrSlug}`}
          className="block text-center py-3 rounded-lg border border-neutral-400 text-neutral-700 font-medium"
        >
          Return to project home
        </Link>
      </div>
    </main>
  );
}
