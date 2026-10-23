"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminLogoutButton from "@/components/AdminLogoutButton";

type Project = { id: string; name: string; qrSlug: string };
type Person = {
  id: string;
  name: string;
  active: boolean;
  archived: boolean;
  needsReview?: boolean;
  hasPin?: boolean;
};

const BRAND_GRADIENT = "linear-gradient(135deg, #10b981 0%, #047857 55%, #064e3b 100%)";
const SIDEBAR_GRADIENT = "linear-gradient(180deg, #059669 0%, #047857 45%, #064e3b 100%)";

const ICONS: Record<string, React.ReactNode> = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 14.2c3 .3 5.5 2.7 5.5 5.8" />
    </>
  ),
  saved: <path d="M6 3h12v18l-6-4-6 4z" />,
  export: <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3" />,
  stats: <path d="M4 20V11M10 20V5M16 20v-6M2 20h20" />,
  supervisor: (
    <>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  back: <path d="M15 5l-7 7 7 7" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  chevron: <path d="M6 9l6 6 6-6" />,
};

function Icon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </svg>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

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
  const setPin = async (id: string, pin: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/supervisors/${id}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not set the PIN.");
      }
      await loadPeople();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const term = search.trim().toLowerCase();
  const list = tab === "workers" ? workers : supervisors;
  const matches = (p: Person) => !term || p.name.toLowerCase().includes(term);
  const activeAll = list.filter((p) => !p.archived);
  const activeList = activeAll
    .filter(matches)
    .sort(
      (a, b) =>
        (b.needsReview ? 1 : 0) - (a.needsReview ? 1 : 0) || a.name.localeCompare(b.name)
    );
  const archivedAll = list.filter((p) => p.archived);
  const archivedList = archivedAll.filter(matches).sort((a, b) => a.name.localeCompare(b.name));
  const reviewCount = activeAll.filter((p) => p.needsReview).length;
  const singular = tab === "workers" ? "worker" : "supervisor";
  const plural = tab === "workers" ? "workers" : "supervisors";

  const workerPageSlug = projects.find((p) => p.id === projectId)?.qrSlug ?? projects[0]?.qrSlug;
  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: "home" },
    { href: "/admin/people", label: "People", icon: "people" },
    { href: "/admin/hazard-templates", label: "Saved answers", icon: "saved" },
    { href: "/admin/export", label: "Export", icon: "export" },
    { href: "/stats", label: "Statistics", icon: "stats" },
    { href: "/supervisor/login", label: "Supervisor", icon: "supervisor" },
    ...(workerPageSlug ? [{ href: `/${workerPageSlug}`, label: "Worker page", icon: "phone" }] : []),
  ];

  const tabCount = (t: "workers" | "supervisors") =>
    (t === "workers" ? workers : supervisors).filter((p) => !p.archived).length;

  return (
    <div className="min-h-dvh w-full min-w-0 bg-neutral-50 md:flex">
      {/* ---------- Computer: JSAFE sidebar ---------- */}
      <aside
        className="hidden md:flex md:flex-col md:w-64 md:shrink-0 md:sticky md:top-0 md:h-dvh md:overflow-y-auto text-white px-4 py-6"
        style={{ background: SIDEBAR_GRADIENT }}
      >
        <div className="flex items-center gap-3 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192_2.png"
            alt=""
            className="w-11 h-11 rounded-xl shadow-lg ring-2 ring-white/25 shrink-0"
          />
          <div>
            <p className="text-xl font-extrabold tracking-wide leading-none">JSAFE</p>
            <p className="text-xs text-emerald-50/80 mt-1">Admin</p>
          </div>
        </div>
        <p className="mt-4 px-2 text-xs font-medium text-emerald-50/80 leading-snug">
          Take 5. Work safe. Go home safe.
        </p>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const active = item.href === "/admin/people";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${
                  active
                    ? "font-semibold bg-white/15"
                    : "text-emerald-50/90 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon name={item.icon} className="w-[18px] h-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6">
          <AdminLogoutButton className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-white bg-white/10 ring-1 ring-white/20 hover:bg-white/20 disabled:opacity-60" />
        </div>
      </aside>

      {/* ---------- Main area ---------- */}
      <main className="flex-1 min-w-0 px-4 py-6 md:px-8 md:py-7">
        <div className="max-w-3xl mx-auto">
          {/* ---------- Phone: JSAFE header ---------- */}
          <header
            className="md:hidden -mx-4 -mt-6 mb-5 px-5 pt-6 pb-5 rounded-b-3xl text-white shadow-md"
            style={{ background: BRAND_GRADIENT }}
          >
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 -ml-1 rounded-full bg-white/15 ring-1 ring-white/30 active:bg-white/25"
              >
                <Icon name="back" className="w-4 h-4" />
                Dashboard
              </Link>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-192_2.png"
                alt=""
                className="w-9 h-9 rounded-xl shadow ring-2 ring-white/30 shrink-0"
              />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center shrink-0">
                <Icon name="people" className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-extrabold leading-none">People</p>
                <p className="text-sm text-emerald-50/90 mt-1 truncate">
                  Workers &amp; supervisors
                  {projects.length === 1 ? ` · ${projects[0].name}` : ""}
                </p>
              </div>
            </div>
          </header>

          {/* ---------- Computer: title line ---------- */}
          <div className="hidden md:block mb-6">
            <h1 className="text-2xl font-bold text-neutral-900">People</h1>
            <p className="text-sm text-neutral-500">
              Workers &amp; supervisors
              {projects.length === 1 ? ` · ${projects[0].name}` : ""}
            </p>
          </div>

          {/* Project picker (only when there's more than one) */}
          {projects.length > 1 && (
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1.5">
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {projects.length === 0 && !loading && (
            <p className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-800">
              No project found — this needs a project to exist before people can be added.
            </p>
          )}

          {/* Workers / Supervisors switch */}
          <div className="flex w-full md:w-auto md:inline-flex p-1 mb-5 rounded-full bg-white border border-neutral-200 shadow-sm">
            {(["workers", "supervisors"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setSearch("");
                  setShowBulk(false);
                  setBulkResult(null);
                }}
                className={`flex-1 md:flex-none md:px-6 py-2 rounded-full text-sm font-semibold capitalize flex items-center justify-center gap-2 transition-colors ${
                  tab === t ? "bg-emerald-700 text-white shadow" : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {t}
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                    tab === t ? "bg-white/25 text-white" : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {tabCount(t)}
                </span>
              </button>
            ))}
          </div>

          {tab === "workers" && reviewCount > 0 && (
            <div className="flex items-start gap-3 mb-4 rounded-2xl bg-amber-50 border border-amber-300 px-4 py-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-amber-500 text-white text-sm font-bold flex items-center justify-center">
                {reviewCount}
              </span>
              <p className="text-sm text-amber-900">
                <span className="font-semibold">
                  New worker{reviewCount === 1 ? "" : "s"} to check.
                </span>{" "}
                {reviewCount === 1 ? "Someone" : "They"} added themselves on site. Tap{" "}
                <span className="font-semibold">Confirm</span> once you know the name is right.
              </p>
            </div>
          )}

          {/* Add a person */}
          <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 md:p-5 mb-4">
            <label className="block font-semibold text-neutral-900 mb-2">Add a {singular}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPerson()}
                placeholder="Full name"
                className="flex-1 min-w-0 rounded-xl border border-neutral-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              />
              <button
                type="button"
                onClick={addPerson}
                disabled={saving || !newName.trim()}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-40"
              >
                <Icon name="plus" className="w-4 h-4" />
                {saving ? "Adding..." : "Add"}
              </button>
            </div>
            {error && (
              <p className="mt-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm font-medium text-red-800">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => setShowBulk((s) => !s)}
              className="mt-3 flex items-center gap-1 text-sm text-emerald-700 font-semibold"
            >
              {showBulk ? "Hide bulk add" : "Add many at once"}
              <Icon
                name="chevron"
                className={`w-4 h-4 transition-transform ${showBulk ? "rotate-180" : ""}`}
              />
            </button>

            {showBulk && (
              <div className="mt-3 border-t border-neutral-100 pt-3">
                <label className="block text-sm font-semibold text-neutral-700 mb-1">
                  Paste a list of names — one per line
                </label>
                <p className="text-xs text-neutral-500 mb-2">
                  From a spreadsheet: select the whole column of names, copy it, and paste it
                  here. Each row becomes its own name.
                </p>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={7}
                  placeholder={"Alex Nguyen\nBrianna Fields\nChris Doukas\n..."}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <button
                  type="button"
                  onClick={addBulk}
                  disabled={bulkSaving || !bulkText.trim()}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-40"
                >
                  {bulkSaving ? "Adding..." : "Add all"}
                </button>
                {bulkResult && (
                  <p className="mt-2 text-sm font-medium text-emerald-700">{bulkResult}</p>
                )}
              </div>
            )}
          </section>

          {/* Duplicates shortcut */}
          <Link
            href="/admin/duplicates"
            className="flex items-center gap-3 mb-6 rounded-2xl bg-white border border-neutral-200 px-4 py-3 shadow-sm hover:border-emerald-300 active:bg-neutral-50"
          >
            <span className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Icon name="copy" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-neutral-800">Check duplicates</span>
              <span className="block text-xs text-neutral-500">
                Same person added twice? Review and merge them.
              </span>
            </span>
            <span className="text-neutral-400">→</span>
          </Link>

          {/* Search */}
          <div className="relative mb-3">
            <Icon
              name="search"
              className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${plural}...`}
              className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
            />
          </div>

          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-white rounded-2xl border border-neutral-200" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="font-bold text-neutral-900">
                  Active <span className="text-neutral-400 font-semibold">{activeList.length}</span>
                </h2>
                {term && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-xs font-semibold text-emerald-700"
                  >
                    Clear search
                  </button>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm divide-y divide-neutral-100 overflow-hidden mb-6">
                {activeList.length === 0 && (
                  <p className="px-4 py-6 text-sm text-neutral-500 text-center">
                    {term ? `No ${plural} match "${search.trim()}".` : `No active ${plural} yet.`}
                  </p>
                )}
                {activeList.map((p) => (
                  <PersonRow
                    key={p.id}
                    person={p}
                    onUpdate={(patch) => updatePerson(p.id, patch)}
                    isSupervisor={tab === "supervisors"}
                    onSetPin={(pin) => setPin(p.id, pin)}
                  />
                ))}
              </div>

              {archivedAll.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowArchived((s) => !s)}
                    className="w-full flex items-center justify-between mb-2 text-left"
                  >
                    <h2 className="font-bold text-neutral-500">
                      Archived <span className="text-neutral-400 font-semibold">{archivedList.length}</span>
                    </h2>
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      {showArchived ? "Hide" : "Show"}
                      <Icon
                        name="chevron"
                        className={`w-4 h-4 transition-transform ${showArchived ? "rotate-180" : ""}`}
                      />
                    </span>
                  </button>
                  {showArchived && (
                    <div className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
                      {archivedList.length === 0 && (
                        <p className="px-4 py-6 text-sm text-neutral-500 text-center">
                          No archived {plural} match.
                        </p>
                      )}
                      {archivedList.map((p) => (
                        <PersonRow
                          key={p.id}
                          person={p}
                          onUpdate={(patch) => updatePerson(p.id, patch)}
                          isSupervisor={tab === "supervisors"}
                          onSetPin={(pin) => setPin(p.id, pin)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <p className="mt-8 mb-2 text-center text-xs text-neutral-400">
            JSAFE · Daily Task Safety Awareness
          </p>
        </div>
      </main>
    </div>
  );
}

function Badge({ tone, children }: { tone: "amber" | "green" | "grey"; children: React.ReactNode }) {
  const cls =
    tone === "amber"
      ? "bg-amber-100 text-amber-800"
      : tone === "green"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-neutral-100 text-neutral-600";
  return (
    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {children}
    </span>
  );
}

function PersonRow({
  person,
  onUpdate,
  isSupervisor,
  onSetPin,
}: {
  person: Person;
  onUpdate: (patch: Partial<Person>) => void;
  isSupervisor: boolean;
  onSetPin: (pin: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(person.name);
  const [settingPin, setSettingPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  const submitPin = () => {
    if (!/^\d{4,6}$/.test(pin)) {
      setPinError("PIN must be 4-6 digits.");
      return;
    }
    onSetPin(pin);
    setPin("");
    setPinError(null);
    setSettingPin(false);
  };

  const dim = person.archived || !person.active;
  const avatarClass = person.needsReview
    ? "bg-amber-100 text-amber-800"
    : dim
    ? "bg-neutral-100 text-neutral-400"
    : "bg-emerald-50 text-emerald-700";

  const chip =
    "text-xs px-3 py-1.5 rounded-full border border-neutral-300 text-neutral-700 font-medium bg-white hover:bg-neutral-50";

  return (
    <div className={`px-4 py-3 ${person.needsReview ? "bg-amber-50/60" : ""}`}>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarClass}`}
          >
            {initials(person.name)}
          </span>
          <div className="min-w-0 flex-1">
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
                className="w-full rounded-lg border border-emerald-600 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                title="Tap to edit the name"
                className={`text-left font-semibold truncate max-w-full ${
                  dim ? "text-neutral-500" : "text-neutral-900"
                }`}
              >
                {person.name}
              </button>
            )}
            <div className="mt-0.5 flex flex-wrap gap-1">
              {person.needsReview && <Badge tone="amber">New — unverified</Badge>}
              {!person.active && !person.archived && <Badge tone="grey">Inactive</Badge>}
              {person.archived && <Badge tone="grey">Archived</Badge>}
              {isSupervisor &&
                (person.hasPin ? <Badge tone="green">PIN set</Badge> : <Badge tone="grey">No PIN</Badge>)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:justify-end sm:shrink-0 pl-[52px] sm:pl-0">
          {person.needsReview && (
            <button
              type="button"
              onClick={() => onUpdate({ needsReview: false })}
              className="text-xs px-3 py-1.5 rounded-full bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
            >
              Confirm
            </button>
          )}
          {isSupervisor && (
            <button type="button" onClick={() => setSettingPin((s) => !s)} className={chip}>
              {person.hasPin ? "Change PIN" : "Set PIN"}
            </button>
          )}
          {!person.archived && (
            <button
              type="button"
              onClick={() => onUpdate({ active: !person.active })}
              className={chip}
            >
              {person.active ? "Set inactive" : "Set active"}
            </button>
          )}
          <button
            type="button"
            onClick={() => onUpdate({ archived: !person.archived })}
            className={chip}
          >
            {person.archived ? "Restore" : "Archive"}
          </button>
        </div>
      </div>

      {settingPin && (
        <div className="mt-3 ml-[52px] flex flex-wrap items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="4-6 digit PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="rounded-xl border border-neutral-300 px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <button
            type="button"
            onClick={submitPin}
            className="text-xs px-3 py-1.5 rounded-full bg-emerald-700 text-white font-semibold"
          >
            Save PIN
          </button>
          {pinError && <p className="text-xs text-red-700 font-medium">{pinError}</p>}
        </div>
      )}
    </div>
  );
}
