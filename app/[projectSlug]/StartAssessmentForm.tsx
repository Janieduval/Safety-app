"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toSydneyInputValue } from "@/lib/timezone";
import {
  saveProjectReference,
  getProjectReference,
  saveLocalAssessment,
  newLocalAssessmentId,
  getAllLocalAssessments,
} from "@/lib/offlineStore";
import { buildSkeletonAssessment } from "@/lib/offlineAssessment";
import { AssessmentWizardCore } from "@/app/assess/AssessmentWizardCore";

type Worker = { id: string; name: string };
type Mode = "home" | "start" | "signon" | "mine";
type CrewAssessment = {
  id: string;
  dateTime: string;
  status: string;
  location: string | null;
  team: string | null;
  author: string | null;
  signedOn: number;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  worker_completed: "Worker completed",
  awaiting_supervisor_review: "Awaiting review",
  changes_required: "Changes required",
  approved: "Approved",
  archived: "Archived",
};

const STATUS_STYLE: Record<string, { badge: string; bar: string }> = {
  draft: { badge: "bg-neutral-100 text-neutral-700", bar: "bg-neutral-300" },
  changes_required: { badge: "bg-amber-100 text-amber-800", bar: "bg-amber-400" },
  approved: { badge: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-500" },
  archived: { badge: "bg-neutral-100 text-neutral-500", bar: "bg-neutral-200" },
};
const DEFAULT_STATUS_STYLE = { badge: "bg-blue-100 text-blue-800", bar: "bg-blue-400" };

function isSydneyToday(dateTime: string) {
  const assessmentDate = toSydneyInputValue(dateTime).slice(0, 10);
  const todayDate = toSydneyInputValue(new Date()).slice(0, 10);
  return assessmentDate === todayDate;
}

function Svg({ children, className = "w-5 h-5" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const SearchIcon = () => (
  <Svg>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Svg>
);
const TickIcon = () => (
  <Svg>
    <path d="M5 12l5 5L20 7" />
  </Svg>
);
const ChevronIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <Svg className={className}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);
const PlusIcon = () => (
  <Svg className="w-6 h-6">
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
const SignIcon = () => (
  <Svg className="w-6 h-6">
    <path d="M3 17c3-3 5 1 8-2s2-6 5-5" />
    <path d="M3 21h18" />
  </Svg>
);
const ListIcon = () => (
  <Svg className="w-6 h-6">
    <path d="M8 6h12M8 12h12M8 18h12" />
    <circle cx="4" cy="6" r="1" />
    <circle cx="4" cy="12" r="1" />
    <circle cx="4" cy="18" r="1" />
  </Svg>
);

const CARD = "bg-white rounded-3xl shadow-sm ring-1 ring-black/5 p-5";
const INPUT =
  "w-full rounded-2xl border border-neutral-300 bg-white pl-11 pr-11 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600";
const DROPDOWN =
  "mt-2 border border-neutral-200 rounded-2xl divide-y divide-neutral-100 max-h-60 overflow-y-auto bg-white shadow-md";

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
  const [mode, setMode] = useState<Mode>("home");
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

  // Crew sign-on: today's Take 5s for this site.
  const [crew, setCrew] = useState<CrewAssessment[] | null>(null);
  const [crewLoading, setCrewLoading] = useState(false);
  const [crewError, setCrewError] = useState<string | null>(null);
  const [crewQuery, setCrewQuery] = useState("");

  // The ID of an offline assessment currently being filled out, rendered
  // in place on this exact page — never as a separate navigation. iOS's
  // standalone "add to home screen" apps have a well-known history of
  // unreliable offline caching for anything beyond the very first page
  // load, so the only fully dependable fix is to never need a second one.
  const [offlineAssessmentId, setOfflineAssessmentId] = useState<string | null>(null);

  // If the app was closed (or reloaded) mid-way through an offline
  // assessment for this project, pick it back up automatically rather
  // than losing track of it.
  useEffect(() => {
    getAllLocalAssessments().then((all) => {
      const match = all.find(
        (p) => p.data?.projectId === projectId && p.syncStatus !== "synced"
      );
      if (match) setOfflineAssessmentId(match.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // Also "warm" the service worker's cache for the fixed offline wizard
    // page itself, using a hidden iframe rather than a plain fetch(). This
    // matters: a service worker only treats a genuine page navigation as
    // a cacheable "document" — a background fetch() doesn't count the
    // same way, so it wouldn't actually be available when truly offline.
    // Unlike a normal online assessment (which gets a real, reusable
    // server ID), an offline-started one gets a brand-new address every
    // time — impossible to have cached in advance. Routing through this
    // one fixed address instead, and warming it here, is what makes it
    // openable with zero signal even on the very first offline use.
    const warmupFrame = document.createElement("iframe");
    warmupFrame.style.display = "none";
    warmupFrame.src = "/assess/offline";
    warmupFrame.onload = () => {
      warmupFrame.remove();
    };
    document.body.appendChild(warmupFrame);
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

  const crewFiltered = useMemo(() => {
    if (!crew) return [];
    const q = crewQuery.trim().toLowerCase();
    if (!q) return crew;
    return crew.filter((c) =>
      [c.team, c.author, c.location].some((v) => (v ?? "").toLowerCase().includes(q))
    );
  }, [crew, crewQuery]);

  const loadCrew = () => {
    setCrewLoading(true);
    setCrewError(null);
    fetch(`/api/projects/${qrSlug}/today`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data) => setCrew(data.assessments ?? []))
      .catch(() =>
        setCrewError(
          typeof navigator !== "undefined" && !navigator.onLine
            ? "Needs signal to load today's Take 5s. Try again once you have signal."
            : "Couldn't load today's Take 5s. Try again."
        )
      )
      .finally(() => setCrewLoading(false));
  };

  const goTo = (next: Mode) => {
    setMode(next);
    setError(null);
    // Each screen starts with a fresh search.
    setViewQuery("");
    setViewSelected(null);
    setMyAssessments(null);
    setCrewQuery("");
    if (next === "signon") loadCrew();
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

  const startOffline = async () => {
    if (!selected) return;
    const ref = await getProjectReference(projectId);
    if (!ref) {
      throw new Error(
        "Can't start offline yet — open this page once with a connection first, so this project's details are saved to your device."
      );
    }
    const localId = newLocalAssessmentId();
    const now = new Date().toISOString();
    const skeleton = buildSkeletonAssessment({ localId, projectId, worker: selected });
    await saveLocalAssessment({
      id: localId,
      isLocal: true,
      createdAt: now,
      updatedAt: now,
      syncStatus: "draft",
      data: skeleton,
    });
    // No navigation of any kind — the wizard renders right here, on this
    // exact already-loaded page. This is what makes it reliable with zero
    // signal: there's nothing new for the phone to try to load.
    setOfflineAssessmentId(localId);
  };

  const start = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);

    // No signal at all — skip the network attempt entirely.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      try {
        await startOffline();
      } catch (e: any) {
        setError(e.message ?? "Could not start an assessment offline.");
      } finally {
        setLoading(false);
      }
      return;
    }

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
      // A network-level failure (e.g. signal dropped mid-request) also
      // falls back to starting the assessment entirely on-device.
      if (e instanceof TypeError) {
        try {
          await startOffline();
        } catch (offlineErr: any) {
          setError(offlineErr.message ?? "Could not start an assessment. Try again.");
        }
      } else {
        setError(e.message ?? "Something went wrong.");
      }
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

  // An offline assessment takes over the whole screen, exactly as before.
  if (offlineAssessmentId) {
    return (
      <Suspense fallback={<p className="text-center text-neutral-500 p-6">Loading...</p>}>
        <AssessmentWizardCore id={offlineAssessmentId} />
      </Suspense>
    );
  }

  // ---------------- Home: three big tiles ----------------
  if (mode === "home") {
    const tile =
      "w-full flex items-center gap-4 rounded-3xl px-5 py-5 text-left transition active:scale-[0.99]";
    return (
      <div className="space-y-3.5">
        <button
          type="button"
          onClick={() => goTo("start")}
          className={`${tile} bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 active:bg-emerald-800`}
        >
          <span className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <PlusIcon />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-lg font-bold">Start new Take 5</span>
            <span className="block text-sm text-emerald-50/85">Your pre-task assessment</span>
          </span>
          <ChevronIcon />
        </button>

        <button
          type="button"
          onClick={() => goTo("signon")}
          className={`${tile} bg-white ring-1 ring-black/5 shadow-sm active:bg-neutral-50`}
        >
          <span className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <SignIcon />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-lg font-bold text-neutral-900">Sign on to a crew</span>
            <span className="block text-sm text-neutral-500">Join today&apos;s assessment</span>
          </span>
          <span className="text-neutral-400">
            <ChevronIcon />
          </span>
        </button>

        <button
          type="button"
          onClick={() => goTo("mine")}
          className={`${tile} bg-white ring-1 ring-black/5 shadow-sm active:bg-neutral-50`}
        >
          <span className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <ListIcon />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-lg font-bold text-neutral-900">My assessments</span>
            <span className="block text-sm text-neutral-500">Drafts &amp; past records</span>
          </span>
          <span className="text-neutral-400">
            <ChevronIcon />
          </span>
        </button>
      </div>
    );
  }

  const backButton = (
    <button
      type="button"
      onClick={() => goTo("home")}
      className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 mb-3 active:text-emerald-900"
    >
      <span className="rotate-180 inline-flex">
        <ChevronIcon className="w-4 h-4" />
      </span>
      Back
    </button>
  );

  // ---------------- Start new Take 5 ----------------
  if (mode === "start") {
    return (
      <div>
        {backButton}
        <section className={CARD}>
          <h2 className="text-xl font-bold text-neutral-900">Start new Take 5</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Find your name, then tap start.</p>

          <label htmlFor="start-name" className="block text-sm font-semibold text-neutral-700 mt-4 mb-1.5">
            Who are you?
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400 pointer-events-none">
              <SearchIcon />
            </span>
            <input
              id="start-name"
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              placeholder="Search your name..."
              autoComplete="off"
              className={`${INPUT} ${selected ? "border-emerald-600 bg-emerald-50/50" : ""}`}
            />
            {selected && (
              <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-emerald-600 pointer-events-none">
                <TickIcon />
              </span>
            )}
          </div>
          {query && !selected && (
            <div className={DROPDOWN}>
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
                  className="w-full text-left px-4 py-3 active:bg-emerald-50"
                >
                  {w.name}
                </button>
              ))}
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

          {error && (
            <p className="mt-3 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={!selected || loading}
            onClick={start}
            className="mt-5 w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-700 text-white text-lg font-bold shadow-md active:bg-emerald-800 disabled:bg-neutral-200 disabled:text-neutral-500 disabled:shadow-none"
          >
            {loading ? "Starting..." : "Start today's Take 5"}
            {!loading && <span aria-hidden>→</span>}
          </button>
        </section>
      </div>
    );
  }

  // ---------------- Sign on to a crew: today's Take 5s ----------------
  if (mode === "signon") {
    return (
      <div>
        {backButton}
        <section className={CARD}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Sign on to a crew</h2>
              <p className="text-sm text-neutral-500 mt-0.5">
                Find your crew&apos;s Take 5 for today, read it, then sign.
              </p>
            </div>
            <button
              type="button"
              onClick={loadCrew}
              disabled={crewLoading}
              className="shrink-0 text-xs font-semibold text-emerald-700 px-2.5 py-1.5 rounded-full bg-emerald-50 active:bg-emerald-100 disabled:opacity-50"
            >
              {crewLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="relative mt-4">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400 pointer-events-none">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={crewQuery}
              onChange={(e) => setCrewQuery(e.target.value)}
              placeholder="Search team, name or location..."
              autoComplete="off"
              className={INPUT}
            />
          </div>

          <div className="mt-4">
            {crewLoading && !crew && <p className="text-sm text-neutral-500">Loading today&apos;s Take 5s...</p>}
            {crewError && (
              <p className="text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {crewError}
              </p>
            )}
            {crew && crew.length === 0 && !crewError && (
              <p className="text-sm text-neutral-500 bg-neutral-50 rounded-xl px-3 py-4 text-center">
                No Take 5s have been started today yet.
              </p>
            )}
            {crew && crew.length > 0 && crewFiltered.length === 0 && (
              <p className="text-sm text-neutral-500 bg-neutral-50 rounded-xl px-3 py-4 text-center">
                Nothing matches &ldquo;{crewQuery.trim()}&rdquo;.
              </p>
            )}
            {crewFiltered.length > 0 && (
              <div className="space-y-2.5">
                {crewFiltered.map((c) => {
                  const style = STATUS_STYLE[c.status] ?? DEFAULT_STATUS_STYLE;
                  return (
                    <Link
                      key={c.id}
                      href={`/assess/${c.id}?view=1`}
                      className="relative flex items-center gap-3 overflow-hidden border border-neutral-200 rounded-2xl pl-4 pr-3 py-3 bg-white active:bg-neutral-50"
                    >
                      <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${style.bar}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-neutral-900 truncate">{c.team ?? "No team"}</span>
                          <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
                            {STATUS_LABELS[c.status] ?? c.status}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 mt-0.5 truncate">
                          Started by {c.author ?? "unknown"} ·{" "}
                          {new Date(c.dateTime).toLocaleTimeString("en-AU", {
                            timeZone: "Australia/Sydney",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                          {c.location && <span className="truncate">{c.location}</span>}
                          <span className="shrink-0 inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            ✓ {c.signedOn} signed
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 text-neutral-400">
                        <ChevronIcon className="w-4 h-4" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  // ---------------- My assessments ----------------
  return (
    <div>
      {backButton}
      <section className={CARD}>
        <h2 className="text-xl font-bold text-neutral-900">My assessments</h2>
        <p className="text-sm text-neutral-500 mt-0.5">
          Find your name to continue a draft or look back at past assessments.
        </p>

        <label htmlFor="view-name" className="block text-sm font-semibold text-neutral-700 mt-4 mb-1.5">
          Your name
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400 pointer-events-none">
            <SearchIcon />
          </span>
          <input
            id="view-name"
            type="text"
            value={viewQuery}
            onChange={(e) => {
              setViewQuery(e.target.value);
              setViewSelected(null);
              setMyAssessments(null);
            }}
            placeholder="Search your name..."
            autoComplete="off"
            className={`${INPUT} ${viewSelected ? "border-emerald-600 bg-emerald-50/50" : ""}`}
          />
          {viewSelected && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-emerald-600 pointer-events-none">
              <TickIcon />
            </span>
          )}
        </div>
        {viewQuery && !viewSelected && (
          <div className={DROPDOWN}>
            {viewFiltered.length === 0 && (
              <p className="p-3 text-neutral-500 text-sm">No matching worker found.</p>
            )}
            {viewFiltered.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => pickViewWorker(w)}
                className="w-full text-left px-4 py-3 active:bg-emerald-50"
              >
                {w.name}
              </button>
            ))}
          </div>
        )}

        {viewSelected && (
          <div className="mt-4">
            {loadingAssessments && <p className="text-sm text-neutral-500">Loading...</p>}
            {!loadingAssessments && myAssessments && myAssessments.length === 0 && (
              <p className="text-sm text-neutral-500 bg-neutral-50 rounded-xl px-3 py-3 text-center">
                No assessments found for this name.
              </p>
            )}
            {!loadingAssessments && myAssessments && myAssessments.length > 0 && (
              <div className="space-y-2.5">
                {myAssessments.map((a: any) => {
                  const today = isSydneyToday(a.dateTime);
                  const isAuthor = a.completedByWorkerId === viewSelected.id;
                  const stillEditable = a.status === "draft" || a.status === "changes_required";
                  // Full edit access only when it's genuinely the author
                  // continuing their own unfinished work. Everyone else —
                  // and even the author once it's been submitted — gets
                  // the safe "view + sign-on only" mode, so anyone who
                  // searches today's assessment can still add their
                  // signature, regardless of who started it.
                  const href = !today
                    ? `/api/assessments/${a.id}/pdf`
                    : isAuthor && stillEditable
                    ? `/assess/${a.id}`
                    : `/assess/${a.id}?view=1`;
                  const latestReview =
                    a.supervisorReviews && a.supervisorReviews.length > 0
                      ? a.supervisorReviews[a.supervisorReviews.length - 1]
                      : null;
                  const style = STATUS_STYLE[a.status] ?? DEFAULT_STATUS_STYLE;
                  const rowClass =
                    "relative flex items-start gap-3 overflow-hidden border border-neutral-200 rounded-2xl pl-4 pr-3 py-3 bg-white active:bg-neutral-50";
                  const rowContent = (
                    <>
                      <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${style.bar}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-neutral-900 text-sm truncate">
                            {a.team?.label ?? a.otherTeamText ?? a.project?.name ?? "Assessment"}
                          </span>
                          <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
                            {STATUS_LABELS[a.status] ?? a.status}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          {today && (
                            <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                              Today
                            </span>
                          )}
                          {new Date(a.dateTime).toLocaleString("en-AU", {
                            timeZone: "Australia/Sydney",
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit",
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
                      </div>
                      <span className="shrink-0 self-center text-neutral-400">
                        <ChevronIcon className="w-4 h-4" />
                      </span>
                    </>
                  );
                  return !today ? (
                    <a key={a.id} href={href} target="_blank" rel="noreferrer" className={rowClass}>
                      {rowContent}
                    </a>
                  ) : (
                    <Link key={a.id} href={href} className={rowClass}>
                      {rowContent}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
