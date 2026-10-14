"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getLocalAssessment,
  saveLocalAssessment,
  getProjectReference,
  isLocalId,
} from "./offlineStore";
import { applyLocalSection } from "./offlineAssessment";

// ---------------- Shared save tracking ----------------
// Lets a reload wait until pending saves have reached the server, so it
// never fetches an older copy and shows text the worker already changed.
const saveDrainers = new Map<string, () => Promise<void>>();

async function waitForPendingSaves(assessmentId: string, timeoutMs = 10000) {
  const drain = saveDrainers.get(assessmentId);
  if (!drain) return;
  await Promise.race([drain(), new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
}

export function useAssessmentData(id: string) {
  const [assessment, setAssessment] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Lightweight refresh used after most in-session actions (answering a
  // question, adding a hazard card, etc). Only re-fetches the assessment
  // itself — not the project's worker/SWMS/PPE lists, which don't change
  // from these actions — and crucially does NOT toggle the page-level
  // loading flag, so the screen doesn't flash back to a full loading state
  // on every click.
  const reloadAssessment = useCallback(async () => {
    await waitForPendingSaves(id);
    if (isLocalId(id)) {
      try {
        const local = await getLocalAssessment(id);
        if (!local) throw new Error("This offline assessment could not be found on this device.");
        setAssessment(local.data);
      } catch (e: any) {
        setError(
          e.message === "This offline assessment could not be found on this device."
            ? e.message
            : "Couldn't load this offline assessment from your device. Try reopening the app."
        );
      }
      return;
    }
    try {
      const res = await fetch(`/api/assessments/${id}`);
      if (!res.ok) throw new Error("Could not load this assessment.");
      const { assessment } = await res.json();
      setAssessment(assessment);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    }
  }, [id]);
  // Full reload: assessment + project + teams, with the loading flag.
  // Used only for the initial page load.
  const reload = useCallback(async () => {
    setLoading(true);
    await waitForPendingSaves(id);
    if (isLocalId(id)) {
      try {
        const local = await getLocalAssessment(id);
        if (!local) throw new Error("This offline assessment could not be found on this device.");
        setAssessment(local.data);
        const ref = await getProjectReference(local.data.projectId);
        if (ref) {
          setProject(ref.project);
          setTeams(ref.teams ?? []);
        } else {
          setError(
            "This project's details weren't found on this device, so some options may be missing."
          );
        }
      } catch (e: any) {
        setError(
          e.message === "This offline assessment could not be found on this device."
            ? e.message
            : "Couldn't load this offline assessment from your device. Try reopening the app."
        );
      } finally {
        setLoading(false);
      }
      return;
    }
    try {
      const res = await fetch(`/api/assessments/${id}`);
      if (!res.ok) throw new Error("Could not load this assessment.");
      const { assessment } = await res.json();
      setAssessment(assessment);
      const projRes = await fetch(`/api/projects/${assessment.project.qrSlug}`);
      if (projRes.ok) {
        const { project, teams } = await projRes.json();
        setProject(project);
        setTeams(teams);
      }
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { assessment, project, teams, loading, error, reload, reloadAssessment };
}

// ---------------- Autosave ----------------

type SaveStatus = "idle" | "saving" | "saved" | "error";
type SaveResult = { ok: boolean; result: any };
type Outcome = SaveResult & { retryable: boolean };
type Job = {
  key: string | null; // null = must be sent as-is (creates/deletes), never merged
  section: string;
  data: any;
  resolvers: Array<(r: SaveResult) => void>;
};

const DEBOUNCE_MS = 500; // wait for a pause in typing before sending
const RETRY_DELAYS_MS = [1000, 3000, 8000];
const STALLED_RETRY_MS = 15000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Saves for the same thing (the same hazard card, the same question...)
// share a key, so only the newest version is sent. Saves that create or
// delete something get no key and are always sent exactly as made.
function coalesceKey(section: string, data: any): string | null {
  if (section === "hazardCard" && !data?.id) return null; // creates a new card
  if (section === "changeEntry" || section === "deleteHazardCard") return null;
  const id = data?.id ?? data?.questionKey ?? data?.declarationKey ?? "";
  return `${section}:${id}`;
}

function createSaveQueue(assessmentId: string, setStatus: (s: SaveStatus) => void) {
  const url = `/api/assessments/${assessmentId}/autosave`;
  const waiting = new Map<string, { job: Job; timer: ReturnType<typeof setTimeout> }>();
  let queue: Job[] = [];
  let running = false;
  let hadError = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let idleWaiters: Array<() => void> = [];

  const isIdle = () => waiting.size === 0 && queue.length === 0 && !running;

  const notifyIdle = () => {
    if (!isIdle()) return;
    const waiters = idleWaiters;
    idleWaiters = [];
    waiters.forEach((w) => w());
  };

  const settle = (job: Job, r: SaveResult) => {
    const resolvers = job.resolvers;
    job.resolvers = [];
    resolvers.forEach((resolve) => resolve(r));
  };

  async function sendOnce(job: Job): Promise<Outcome> {
    if (isLocalId(assessmentId)) {
      try {
        const local = await getLocalAssessment(assessmentId);
        if (!local) return { ok: false, result: null, retryable: false };
        const updatedData = applyLocalSection(local.data, job.section, job.data);
        await saveLocalAssessment({ ...local, data: updatedData });
        let result: any = null;
        if (job.section === "hazardCard") {
          const hr = updatedData.hazardResponses.find(
            (r: any) => r.id === job.data.hazardResponseId
          );
          if (hr) {
            result = job.data.id
              ? hr.cards.find((c: any) => c.id === job.data.id)
              : hr.cards[hr.cards.length - 1];
          }
        }
        return { ok: true, result, retryable: false };
      } catch {
        return { ok: false, result: null, retryable: false };
      }
    }
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: job.section, data: job.data }),
      });
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: true, result: body.result ?? null, retryable: false };
      }
      // Server hiccups are worth retrying; a rejected save (4xx) isn't.
      const retryable = res.status >= 500 || res.status === 408 || res.status === 429;
      return { ok: false, result: null, retryable };
    } catch {
      // No connection — worth retrying.
      return { ok: false, result: null, retryable: true };
    }
  }

  // Sends queued saves one at a time, in order, so an older save can never
  // land after a newer one and overwrite it.
  async function run() {
    if (running) return;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    running = true;
    setStatus("saving");
    while (queue.length > 0) {
      const job = queue[0];
      let outcome = await sendOnce(job);
      for (let i = 0; !outcome.ok && outcome.retryable && i < RETRY_DELAYS_MS.length; i++) {
        await sleep(RETRY_DELAYS_MS[i]);
        outcome = await sendOnce(job);
      }
      if (!outcome.ok && outcome.retryable && job.key) {
        // Still no connection. Keep this change at the front of the line
        // and try again shortly, or as soon as the phone is back online.
        settle(job, { ok: false, result: null });
        running = false;
        setStatus("error");
        retryTimer = setTimeout(run, STALLED_RETRY_MS);
        return;
      }
      queue.shift();
      if (!outcome.ok) hadError = true;
      settle(job, { ok: outcome.ok, result: outcome.result });
    }
    running = false;
    setStatus(hadError ? "error" : "saved");
    hadError = false;
    notifyIdle();
  }

  function enqueue(job: Job) {
    if (job.key) {
      // If a save for the same thing is already waiting in line (and not
      // being sent right now), just give it the newer data.
      const start = running ? 1 : 0;
      for (let i = start; i < queue.length; i++) {
        if (queue[i].key === job.key) {
          queue[i].data = job.data;
          queue[i].resolvers.push(...job.resolvers);
          run();
          return;
        }
      }
    }
    queue.push(job);
    run();
  }

  function flushWaiting() {
    const entries = Array.from(waiting.values());
    waiting.clear();
    for (const { job, timer } of entries) {
      clearTimeout(timer);
      enqueue(job);
    }
  }

  // A deleted card's pending edits no longer need sending.
  function dropPendingFor(key: string) {
    const w = waiting.get(key);
    if (w) {
      clearTimeout(w.timer);
      waiting.delete(key);
      settle(w.job, { ok: true, result: null });
    }
    const start = running ? 1 : 0;
    queue = queue.filter((j, i) => {
      if (i >= start && j.key === key) {
        settle(j, { ok: true, result: null });
        return false;
      }
      return true;
    });
  }

  function save(section: string, data: any): Promise<SaveResult> {
    return new Promise((resolve) => {
      if (section === "deleteHazardCard" && data?.id) {
        dropPendingFor(`hazardCard:${data.id}`);
      }
      const key = coalesceKey(section, data);
      if (!key) {
        // Send everything typed so far first, so things stay in order
        // (e.g. a "Yes" answer reaches the server before its new card).
        flushWaiting();
        enqueue({ key: null, section, data, resolvers: [resolve] });
        return;
      }
      setStatus("saving");
      const existing = waiting.get(key);
      if (existing) clearTimeout(existing.timer);
      const job: Job = existing ? existing.job : { key, section, data, resolvers: [] };
      job.data = data;
      job.resolvers.push(resolve);
      const timer = setTimeout(() => {
        if (waiting.get(key)?.job !== job) return;
        waiting.delete(key);
        enqueue(job);
      }, DEBOUNCE_MS);
      waiting.set(key, { job, timer });
    });
  }

  // Resolves once every pending save has been sent.
  function drain(): Promise<void> {
    flushWaiting();
    if (isIdle()) return Promise.resolve();
    return new Promise((resolve) => idleWaiters.push(resolve));
  }

  // Called when the app is closed or the phone switches apps: push out any
  // unsent changes immediately, in a way the browser finishes even if the
  // page is closing.
  function sendPendingNow() {
    if (!isLocalId(assessmentId)) {
      const jobs = [
        ...Array.from(waiting.values()).map((w) => w.job),
        ...queue.filter((j) => j.key),
      ];
      for (const job of jobs) {
        try {
          fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ section: job.section, data: job.data }),
            keepalive: true,
          }).catch(() => {});
        } catch {
          // ignore — the normal queue will still retry
        }
      }
    }
    flushWaiting();
  }

  function resume() {
    if (!running && queue.length > 0) run();
  }

  return { save, drain, sendPendingNow, resume };
}

// Autosave with typing pauses, in-order sending, retries and status
// tracking for the UI. Returns whatever row the save produced (e.g. a
// newly created hazard card), so a caller that needs it — like "add a
// hazard card" — can update its own state directly.
export function useAutosave(assessmentId: string) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const saver = useMemo(() => createSaveQueue(assessmentId, setStatus), [assessmentId]);

  useEffect(() => {
    saveDrainers.set(assessmentId, saver.drain);
    const onHide = () => saver.sendPendingNow();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") saver.sendPendingNow();
    };
    const onOnline = () => saver.resume();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    return () => {
      if (saveDrainers.get(assessmentId) === saver.drain) saveDrainers.delete(assessmentId);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [assessmentId, saver]);

  return { save: saver.save, status, flush: saver.drain };
}
