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
  const activeList = list.filter((p) => !p.archived);
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
        <p className="text-sm text-red-700
