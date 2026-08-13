"use client";

// Lightweight IndexedDB wrapper for offline assessment support.
// Two stores:
//  - "assessments": full local copies of in-progress assessments, keyed by
//    a local ID (offline-started) or the real server ID (once synced).
//  - "referenceData": cached per-project dropdown/reference data (teams,
//    SWMS options, PPE options, permit types, workers) so the wizard has
//    real options to show even with zero signal.

const DB_NAME = "safety-app-offline";
const DB_VERSION = 1;
const ASSESSMENTS_STORE = "assessments";
const REFERENCE_STORE = "referenceData";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ASSESSMENTS_STORE)) {
        db.createObjectStore(ASSESSMENTS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(REFERENCE_STORE)) {
        db.createObjectStore(REFERENCE_STORE, { keyPath: "projectId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

// ---------------- Local assessments ----------------

export type LocalAssessment = {
  id: string; // "local-<uuid>" until synced, then replaced with the real server id
  isLocal: boolean; // true until successfully synced to the server
  createdAt: string;
  updatedAt: string;
  syncStatus: "draft" | "pending_sync" | "pending_submit" | "synced" | "sync_error";
  syncError?: string;
  data: any; // full assessment-shaped object the wizard reads/writes directly
};

export async function saveLocalAssessment(assessment: LocalAssessment): Promise<void> {
  assessment.updatedAt = new Date().toISOString();
  await withStore(ASSESSMENTS_STORE, "readwrite", (store) => store.put(assessment));
}

export async function getLocalAssessment(id: string): Promise<LocalAssessment | undefined> {
  return withStore<LocalAssessment | undefined>(ASSESSMENTS_STORE, "readonly", (store) =>
    store.get(id)
  );
}

export async function deleteLocalAssessment(id: string): Promise<void> {
  await withStore(ASSESSMENTS_STORE, "readwrite", (store) => store.delete(id));
}

export async function getAllLocalAssessments(): Promise<LocalAssessment[]> {
  return withStore<LocalAssessment[]>(ASSESSMENTS_STORE, "readonly", (store) =>
    store.getAll()
  );
}

// Anything not yet successfully synced — used by the sync engine (2E).
export async function getPendingLocalAssessments(): Promise<LocalAssessment[]> {
  const all = await getAllLocalAssessments();
  return all.filter((a) => a.syncStatus !== "synced");
}

export function newLocalAssessmentId(): string {
  return `local-${crypto.randomUUID()}`;
}

// ---------------- Cached reference data ----------------

export type CachedProjectReference = {
  projectId: string;
  cachedAt: string;
  project: any;
  teams: any[];
};

export async function saveProjectReference(ref: CachedProjectReference): Promise<void> {
  await withStore(REFERENCE_STORE, "readwrite", (store) => store.put(ref));
}

export async function getProjectReference(
  projectId: string
): Promise<CachedProjectReference | undefined> {
  return withStore<CachedProjectReference | undefined>(REFERENCE_STORE, "readonly", (store) =>
    store.get(projectId)
  );
}
