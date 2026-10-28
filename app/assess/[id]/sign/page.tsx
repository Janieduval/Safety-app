"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAssessmentData } from "@/lib/useAssessment";
import SignaturePad from "@/components/SignaturePad";
import NotifyMe from "@/components/NotifyMe";
import WorkerHeader from "@/components/WorkerHeader";
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
    <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${toneClasses}`}>
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

  if (loading)
    return (
      <main className="min-h-dvh w-full min-w-0 bg-neutral-50">
        <WorkerHeader title="Team sign-on" />
        <div className="max-w-md mx-auto px-4 py-5 space-y-3 animate-pulse">
          <div className="h-16 bg-white rounded-2xl border border-neutral-200" />
          <div className="h-40 bg-white rounded-2xl border border-neutral-200" />
        </div>
      </main>
    );
  if (error || !assessment || !project)
    return (
      <main className="min-h-dvh w-full min-w-0 bg-neutral-50">
        <WorkerHeader title="Team sign-on" />
        <div className="max-w-md mx-auto px-4 py-5">
          <p className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-800">
            {error ?? "Not found."}
          </p>
        </div>
      </main>
    );

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

  const signedCount = assessment.signOns.length;

  return (
    <main className="min-h-dvh w-full min-w-0 bg-neutral-50 pb-10">
      <WorkerHeader
        context={project.name}
        title="Team sign-on"
        subtitle={`${
          assessment.completedByWorker?.name ? `${assessment.completedByWorker.name}'s` : "Today's"
        } JSAFE${assessment.team?.label ? ` · ${assessment.team.label}` : ""}`}
        backHref={`/${project.qrSlug}`}
        backLabel="Home"
      />

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">
        <StatusBanner status={assessment.status} />

        {/* Who has signed */}
        <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-bold text-neutral-900">
              Signed on <span className="text-neutral-400 font-semibold">{signedCount}</span>
            </h2>
            <a href={`/api/assessments/${assessment.id}/pdf`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-700">
              Save PDF
            </a>
          </div>
          {signedCount === 0 ? (
            <p className="text-sm text-neutral-500">No one has signed yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {assessment.signOns.map((s: any) => (
                <li key={s.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                  <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {s.worker.name
                      .trim()
                      .split(/\s+/)
                      .map((p: string) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0 font-medium text-neutral-800 truncate">
                    {s.worker.name}
                    {s.isPrimary && (
                      <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Primary
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-neutral-500 shrink-0">
                    {new Date(s.signedAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {assessment.status !== "draft" && (
          <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4">
            <h2 className="font-bold text-neutral-900 mb-3">Add your signature</h2>
            <input
              type="text"
              placeholder="Search your name..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedWorkerId(null);
              }}
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
            />
            {query && !selectedWorkerId && (
              <div className="mt-1 border border-neutral-200 rounded-xl divide-y divide-neutral-100 bg-white max-h-56 overflow-y-auto shadow-sm">
                {availableWorkers.map((w: any) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      setSelectedWorkerId(w.id);
                      setQuery(w.name);
                    }}
                    className="w-full text-left px-4 py-3 active:bg-emerald-50"
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
                    className="w-full text-left px-4 py-3 text-emerald-700 font-semibold active:bg-emerald-50 disabled:opacity-50"
                  >
                    {addingNew ? "Adding..." : `+ Add "${query.trim()}" as a new worker`}
                  </button>
                )}
              </div>
            )}

            {selectedWorkerId && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-neutral-700 rounded-xl bg-neutral-50 px-3 py-2">
                  {SIGNON_CONFIRMATION_TEXT}
                </p>
                <label
                  className={`flex items-center gap-3 rounded-xl border p-3 text-sm font-medium cursor-pointer ${
                    confirmed ? "border-emerald-300 bg-emerald-50" : "border-neutral-200 bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="w-5 h-5 shrink-0 accent-emerald-700"
                  />
                  I confirm I have reviewed and understood this assessment
                </label>
                {confirmed && <SignaturePad onCapture={capture} disabled={saving} />}
                {signError && (
                  <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm font-medium text-red-800">
                    {signError}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        <section className="pt-2 space-y-3">
          <p className="text-sm text-neutral-600 text-center">
            Once everyone who needs to has signed on, you&apos;re done on this device — a supervisor
            will review the assessment separately.
          </p>
          {assessment.status === "awaiting_supervisor_review" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
              <NotifyMe assessmentId={assessment.id} />
            </div>
          )}
          <Link
            href={`/${project.qrSlug}`}
            className="block text-center py-3 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
          >
            Back to JSAFE home
          </Link>
        </section>
      </div>
    </main>
  );
}
