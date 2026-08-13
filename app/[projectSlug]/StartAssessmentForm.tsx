"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toSydneyInputValue } from "@/lib/timezone";
import { saveProjectReference } from "@/lib/offlineStore";

type Worker = { id: string; name: string };

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  worker_completed: "Worker completed",
  awaiting_supervisor_review: "Awaiting review",
  changes_required: "Changes required",
  approved: "Approved",
  archived: "Archived",
};

function isSydneyToday(dateTime: string) {
  const assessmentDate = toSydneyInputValue(dateTime).slice(0, 10);
  const todayDate = toSydneyInputValue(new Date()).slice(0, 10);
  return assessmentDate === todayDate;
}

export default function StartAssessmentForm({
  projectId,
  qrSlug,
  workers,
}: {
  projectId: string;
  qrSlug: string;
  workers: Worker[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Worker | null>(null);
  const [localWorkers, setLocalWorkers] = useState<Worker[]>(workers);
  const [loading, setLoading] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewQuery, setViewQuery] = useState("");
  const [viewSelected, setViewSelected] = useState<Worker | null>(null);
  const [myAssessments, setMyAssessments] = useState<any[] | null>(null);
  const [loadingAssessments, setLoadingAssessments] = useState(false);

  // Silently cache this project's full reference data (teams, SWMS
  // options, PPE options, permit types, workers) on-device whenever this
  // page loads with a connection. This is what lets a worker start and
  // complete an assessment later with zero signal — without this, the
  // wizard would have no options to show in its dropdowns while offline.
  useEffect(() => {
    fetch(`/api/projects/${qrSlug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        if (result?.project) {
          saveProjectReference({
            projectId,
            cachedAt: new Date().toISOString(),
            project: result.project,
            teams: result.teams ?? [],
          });
        }
      })
      .catch(() => {
        // Offline, or the request failed — nothing to do here. The wizard
        // will fall back to whatever was cached the last time this page
        // loaded successfully.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return localWorkers;
    const q = query.toLowerCase();
    return localWorkers.filter((w) => w.name.toLowerCase().includes(q));
  }, [query, localWorkers]);

  const exactMatchExists = useMemo(
    () => filtered.some((w) => w.name.toLowerCase() === query.trim().toLowerCase()),
    [filtered, query]
  );

  const viewFiltered = useMemo(() => {
    if (!viewQuery.trim()) return localWorkers;
    const q = viewQuery.toLowerCase();
    return localWorkers.filter((w) => w.name.toLowerCase().includes(q));
  }, [viewQuery, localWorkers]);

  const addNewWorker = async () => {
    const trimmedName = query.trim();
    if (!trimmedName) return;
    setAddingNew(true);
    setError(null);
    try {
      const res = await fetch("/api/workers/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name: trimmedName }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not add you as a new worker.");
      }
      const { worker } = await res.json();
      setLocalWorkers((prev) => [...prev, worker]);
      setSelected(worker);
      setQuery(worker.name);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAddingNew(false);
    }
  };

  const start = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, completedByWorkerId: selected.id }),
      });
      if (!res.ok) throw new Error("Could not start a new assessment. Try again.");
      const { assessment } = await res.json();
      router.push(`/assess/${assessment.id}`);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const pickViewWorker = (w: Worker) => {
    setViewSelected(w);
    setViewQuery(w.name);
    setLoadingAssessments(true);
    setMyAssessments(null);
    fetch(`/api/workers/${w.id}/assessments`)
      .then((res) => (res.ok ? res.json() : { assessments: [] }))
      .then((data) => setMyAssessments(data.assessments ?? []))
      .catch(() => setMyAssessments([]))
      .finally(() => setLoadingAssessments(false));
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-1">
            Select your name to start a new assessment
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder="Search your name..."
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base"
          />
          {query && !selected && (
            <div className="mt-1 border border-neutral-200 rounded-lg divide-y max-h-56 overflow-y-auto bg-white">
              {filtered.length === 0 && (
                <p className="p-3 text-neutral-500 text-sm">No matching worker found.</p>
              )}
              {filtered.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setSelected(w);
                    setQuery(w.name);
                  }}
                  className="w-full text-left px-4 py-3 active:bg-neutral-100"
                >
                  {w.name}
                </button>
              ))}
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
        </div>
        {error && <p className="text-red-700 text-sm font-medium">{error}</p>}
        <button
          type="button"
          disabled={!selected || loading}
          onClick={start}
          className="w-full py-4 rounded-lg bg-emerald-700 text-white text-lg font-semibold disabled:bg-neutral-300 disabled:text-neutral-500 active:bg-emerald-800"
        >
          {loading ? "Starting..." : "Start new assessment"}
        </button>
        <p className="text-center text-sm text-neutral-500">
          Already started an assessment today, or joining as a team member?
          Ask the person who started it to open their link and add your signature there.
        </p>
      </div>

      <div className="border-t border-neutral-200 pt-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-1">
            Select your name to view past assessments
          </label>
          <input
            type="text"
            value={viewQuery}
            onChange={(e) => {
              setViewQuery(e.target.value);
              setViewSelected(null);
              setMyAssessments(null);
            }}
            placeholder="Search your name..."
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base"
          />
          {viewQuery && !viewSelected && (
            <div className="mt-1 border border-neutral-200 rounded-lg divide-y max-h-56 overflow-y-auto bg-white">
              {viewFiltered.length === 0 && (
                <p className="p-3 text-neutral-500 text-sm">No matching worker found.</p>
              )}
              {viewFiltered.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => pickViewWorker(w)}
                  className="w-full text-left px-4 py-3 active:bg-neutral-100"
                >
                  {w.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {viewSelected && (
          <div>
            {loadingAssessments && <p className="text-sm text-neutral-500">Loading...</p>}
            {!loadingAssessments && myAssessments && myAssessments.length === 0 && (
              <p className="text-sm text-neutral-500">No assessments found for this name.</p>
            )}
            {!loadingAssessments && myAssessments && myAssessments.length > 0 && (
              <div className="space-y-2">
                {myAssessments.map((a: any) => {
                  const today = isSydneyToday(a.dateTime);
                  const isAuthor = a.completedByWorkerId === viewSelected.id;
                  const href = !today
                    ? `/api/assessments/${a.id}/pdf`
                    : isAuthor
                    ? `/assess/${a.id}`
                    : `/assess/${a.id}?view=1`;
                  const latestReview =
                    a.supervisorReviews && a.supervisorReviews.length > 0
                      ? a.supervisorReviews[a.supervisorReviews.length - 1]
                      : null;
                  const rowContent = (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-neutral-900 text-sm">
                          {a.team?.label ?? a.otherTeamText ?? a.project?.name ?? "Assessment"}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            a.status === "changes_required"
                              ? "bg-amber-100 text-amber-800"
                              : a.status === "draft"
                              ? "bg-neutral-100 text-neutral-700"
                              : a.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {STATUS_LABELS[a.status] ?? a.status}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        {new Date(a.dateTime).toLocaleString("en-AU", {
                          timeZone: "Australia/Sydney",
                        })}
                        {!today && " · Opens as PDF"}
                      </p>
                      {a.status === "changes_required" && latestReview && (
                        <details className="mt-2">
                          <summary
                            className="text-xs font-semibold text-amber-700 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View supervisor comments
                          </summary>
                          <div className="mt-1 text-xs text-neutral-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                            <p className="font-medium">
                              {latestReview.supervisor?.name ?? "Supervisor"}:
                            </p>
                            {latestReview.comments && <p className="mt-0.5">{latestReview.comments}</p>}
                            {latestReview.additionalControls && (
                              <p className="mt-0.5">
                                Additional controls: {latestReview.additionalControls}
                              </p>
                            )}
                            {!latestReview.comments && !latestReview.additionalControls && (
                              <p className="mt-0.5">No additional comments were left.</p>
                            )}
                          </div>
                        </details>
                      )}
                    </>
                  );
                  return !today ? (
                    <a
                      key={a.id}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="block border border-neutral-200 rounded-lg p-3 bg-white active:bg-neutral-50"
                    >
                      {rowContent}
                    </a>
                  ) : (
                    <Link
                      key={a.id}
                      href={href}
                      className="block border border-neutral-200 rounded-lg p-3 bg-white active:bg-neutral-50"
                    >
                      {rowContent}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
