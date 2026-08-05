"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Project = { id: string; name: string; qrSlug: string };
type Person = { id: string; name: string; active: boolean; archived: boolean };

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

  const loadProjects = useCallback(async () => {
    const res = await fetch("/api/admin/projects");
    if (!res.ok) return;
    const { projects } = await res.json();
    setProjects(projects);
    if (projects.length > 0 && !projectId) setProjectId(projects[0].id);
  }, [projectId]);

  const loadPeople = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [wRes, sRes] = await Promise.all([
        fetch(`/api/admin/workers?projectId=${projectId}`),
        fetch(`/api/admin/supervisors?projectId=${projectId}`),
      ]);
      if (wRes.ok) setWorkers((await wRes.json()).workers);
      if (sRes.ok) setSupervisors((await sRes.json()).supervisors);
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
    if (!newName.trim() || !projectId) return;
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
  const activeList = list.filter((p) => !p.archived);
  const archivedList = list.filter((p) => p.archived);

  return (
    <main className="min-h-dvh bg-neutral-50 px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-neutral-900">Manage workers &amp; supervisors</h1>
        <Link href="/admin/dashboard" className="text-sm text-emerald-700 font-medium">
          ← Dashboard
        </Link>
      </div>

      {projects.length > 1 && (
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
        person.archived ? "bg-neutral-100 border-neutral-200" : "bg-white border-neutral-200"
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
          {!person.active && !person.archived && (
            <span className="ml-2 text-xs text-amber-700 font-semibold">INACTIVE</span>
          )}
        </button>
      )}

      <div className="flex gap-2 flex-shrink-0">
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
