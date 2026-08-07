"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Project = { id: string; name: string; qrSlug: string };
type Person = {
  id: string;
  name: string;
  active: boolean;
  archived: boolean;
  needsReview?: boolean;
};

export default function ManagePeoplePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [tab, setTab] = useState<"workers" | "supervisors">("workers");
  const [workers, setWorkers] = useState<Person[]>([]);
  const [supervisors, setSupervisors] = useState<Person[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/projects");
      if (!res.ok) {
        setError(`Could not load projects (error ${res.status}). Try refreshing.`);
        setLoading(false);
        return;
      }
      const { projects } = await res.json();
      setProjects(projects);
      if (projects.length === 0) {
        setError("No active projects found. Add one before managing workers.");
        setLoading(false);
      } else if (!projectId) {
        setProjectId(projects[0].id);
      }
    } catch {
      setError("Could not reach the server. Check your connection and refresh.");
      setLoading(false);
    }
  }, [projectId]);

  const loadPeople = useCallback(async () => {
    if (!projectId) return; // loadProjects will have already stopped the loading state in this case
    setLoading(true);
    setError(null);
    try {
      const [wRes, sRes] = await Promise.all([
        fetch(`/api/admin/workers?projectId=${projectId}`),
        fetch(`/api/admin/supervisors?projectId=${projectId}`),
      ]);
      if (wRes.ok) setWorkers((await wRes.json()).workers);
      if (sRes.ok) setSupervisors((await sRes.json()).supervisors);
      if (!wRes.ok || !sRes.ok) {
        setError("Some data failed to load. Try refreshing the page.");
      }
    } catch {
      setError("Could not reach the server. Check your connection and refresh.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  const addPerson = async () => {
    if (!newName.trim()) return;
    if (!projectId) {
      setError("No project is selected — refresh the page and try again.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const endpoint = tab === "workers" ? "/api/admin/workers" : "/api/admin/supervisors";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name: newName.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not add that person.");
      }
      setNewName("");
      await loadPeople();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const addBulk = async () => {
    const names = bulkText
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    if (names.length === 0) return;
    if (!projectId) {
      setError("No project is selected — refresh the page and try again.");
      return;
    }
    setBulkSaving(true);
    setBulkResult(null);
    setError(null);
    try {
      const endpoint =
        tab === "workers" ? "/api/admin/workers/bulk" : "/api/admin/supervisors/bulk";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, names }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not add these people.");
      }
      const result = await res.json();
      setBulkResult(
        `Added ${result.created} ${tab === "workers" ? "worker" : "supervisor"}${
          result.created === 1 ? "" : "s"
        }.` +
          (result.skippedAsDuplicates > 0
            ? ` Skipped ${result.skippedAsDuplicates} that already existed.`
            : "")
      );
      setBulkText("");
      await loadPeople();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBulkSaving(false);
    }
  };

  const updatePerson = async (id: string, patch: Partial<Person>) => {
    const endpoint =
      tab === "workers" ? `/api/admin/workers/${id}` : `/api/admin/supervisors/${id}`;
    await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await loadPeople();
  };

  const list = tab === "workers" ? workers : supervisors;
  const activeList = list
    .filter((p) => !p.archived)
    .sort((a, b) => (b.needsReview ? 1 : 0) - (a.needsReview ? 1 : 0));
  const archivedList = list.filter((p) => p.archived);
  const reviewCount = activeList.filter((p) => p.needsReview).length;

  return (
    <main className="min-h-dvh bg-neutral-50 px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-neutral-900">Manage workers &amp; supervisors</h1>
        <Link href="/admin/dashboard" className="text-sm text-emerald-700 font-medium">
          ← Dashboard
        </Link>
      </div>

      {projects.length > 1 ? (
        <div className="mb-4">
          <label className="block text-sm font-semibold text-neutral-700 mb-1">Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-2 bg-white"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      ) : projects.length === 1 ? (
        <p className="text-sm text-neutral-500 mb-4">
          Project: <span className="font-medium text-neutral-700">{projects[0].name}</span>
        </p>
      ) : (
        <p className="text-sm text-red-700 font-medium mb-4">
          No project found — this needs a project to exist before people can be added.
        </p>
      )}

      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setTab("workers")}
          className={`px-4 py-2 rounded-full text-sm font-medium border ${
            tab === "workers"
              ? "bg-neutral-900 text-white border-neutral-900"
              : "bg-white text-neutral-700 border-neutral-300"
          }`}
        >
          Workers
        </button>
        <button
          type="button"
          onClick={() => setTab("supervisors")}
          className={`px-4 py-2 rounded-full text-sm font-medium border ${
            tab === "supervisors"
              ? "bg-neutral-900 text-white border-neutral-900"
              : "bg-white text-neutral-700 border-neutral-300"
          }`}
        >
          Supervisors
        </button>
      </div>

      {tab === "workers" && reviewCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-lg p-3 text-sm font-medium mb-4">
          {reviewCount} new worker{reviewCount === 1 ? "" : "s"} added themselves on-site and{" "}
          {reviewCount === 1 ? "needs" : "need"} a quick review below.
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-lg p-4 mb-6">
        <label className="block text-sm font-semibold text-neutral-700 mb-2">
          Add a {tab === "workers" ? "worker" : "supervisor"}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPerson()}
            placeholder="Full name"
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2"
          />
          <button
            type="button"
            onClick={addPerson}
            disabled={saving || !newName.trim()}
            className="px-5 py-2 rounded-lg bg-emerald-700 text-white font-medium disabled:opacity-40"
          >
            Add
          </button>
        </div>
        {error && <p className="text-red-700 text-sm font-medium mt-2">{error}</p>}

        <button
          type="button"
          onClick={() => setShowBulk((s) => !s)}
          className="text-sm text-emerald-700 font-medium underline decoration-dotted mt-3"
        >
          {showBulk ? "Hide bulk add" : "Add many at once →"}
        </button>

        {showBulk && (
          <div className="mt-3 border-t border-neutral-200 pt-3">
            <label className="block text-sm font-semibold text-neutral-700 mb-2">
              Paste a list of names — one per line
            </label>
            <p className="text-xs text-neutral-500 mb-2">
              If you have these in a spreadsheet, select the whole column of names, copy it,
              and paste it directly into the box below — each row becomes its own name
              automatically.
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={8}
              placeholder={"Alex Nguyen\nBrianna Fields\nChris Doukas\n..."}
              className="w-full rounded-lg border border-neutral-300 px-4 py-2 font-mono text-sm"
            />
            <button
              type="button"
              onClick={addBulk}
              disabled={bulkSaving || !bulkText.trim()}
              className="mt-2 px-5 py-2 rounded-lg bg-emerald-700 text-white font-medium disabled:opacity-40"
            >
              {bulkSaving ? "Adding..." : "Add all"}
            </button>
            {bulkResult && (
              <p className="text-emerald-700 text-sm font-medium mt-2">{bulkResult}</p>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-neutral-500 text-sm">Loading...</p>
      ) : (
        <>
          <h2 className="font-semibold text-neutral-900 mb-2">
            Active ({activeList.length})
          </h2>
          <div className="space-y-2 mb-6">
            {activeList.length === 0 && (
              <p className="text-sm text-neutral-500">
                No active {tab === "workers" ? "workers" : "supervisors"} yet.
              </p>
            )}
            {activeList.map((p) => (
              <PersonRow key={p.id} person={p} onUpdate={(patch) => updatePerson(p.id, patch)} />
            ))}
          </div>

          {archivedList.length > 0 && (
            <>
              <h2 className="font-semibold text-neutral-500 mb-2">
                Archived ({archivedList.length})
              </h2>
              <div className="space-y-2">
                {archivedList.map((p) => (
                  <PersonRow
                    key={p.id}
                    person={p}
                    onUpdate={(patch) => updatePerson(p.id, patch)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}

function PersonRow({
  person,
  onUpdate,
}: {
  person: Person;
  onUpdate: (patch: Partial<Person>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(person.name);

  return (
    <div
      className={`flex items-center justify-between border rounded-lg p-3 ${
        person.needsReview
          ? "bg-amber-50 border-amber-300"
          : person.archived
          ? "bg-neutral-100 border-neutral-200"
          : "bg-white border-neutral-200"
      }`}
    >
      {editing ? (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (name.trim() && name.trim() !== person.name) onUpdate({ name: name.trim() });
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          autoFocus
          className="flex-1 rounded border border-neutral-300 px-2 py-1 mr-3"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`text-left flex-1 font-medium ${
            person.archived ? "text-neutral-500" : "text-neutral-900"
          }`}
        >
          {person.name}
          {person.needsReview && (
            <span className="ml-2 text-xs text-amber-700 font-semibold">NEW — UNVERIFIED</span>
          )}
          {!person.active && !person.archived && (
            <span className="ml-2 text-xs text-amber-700 font-semibold">INACTIVE</span>
          )}
        </button>
      )}

      <div className="flex gap-2 flex-shrink-0">
        {person.needsReview && (
          <button
            type="button"
            onClick={() => onUpdate({ needsReview: false })}
            className="text-xs px-3 py-1.5 rounded-full border border-emerald-600 text-emerald-700 font-medium"
          >
            Confirm
          </button>
        )}
        {!person.archived && (
          <button
            type="button"
            onClick={() => onUpdate({ active: !person.active })}
            className="text-xs px-3 py-1.5 rounded-full border border-neutral-300 text-neutral-700"
          >
            {person.active ? "Set inactive" : "Set active"}
          </button>
        )}
        <button
          type="button"
          onClick={() => onUpdate({ archived: !person.archived })}
          className="text-xs px-3 py-1.5 rounded-full border border-neutral-300 text-neutral-700"
        >
          {person.archived ? "Restore" : "Archive"}
        </button>
      </div>
    </div>
  );
}
