"use client";

import { useEffect, useState } from "react";
import StaffShell from "@/components/StaffShell";

// Suggestions: ideas sent from the "Suggest an idea" button by workers,
// supervisors and admins. Every admin can read them here. Their status
// (Planned, Done, Not doing) is set from the JSAFE control centre.

type Status = "new" | "planned" | "done" | "not_doing";
type Suggestion = {
  id: string;
  text: string;
  name: string | null;
  role: "worker" | "supervisor" | "admin";
  status: Status;
  adminNote: string | null;
  createdAt: string;
};

const STATUSES: { key: Status; label: string; pill: string }[] = [
  { key: "new", label: "New", pill: "bg-blue-100 text-blue-800" },
  { key: "planned", label: "Planned", pill: "bg-amber-100 text-amber-800" },
  { key: "done", label: "Done", pill: "bg-emerald-100 text-emerald-800" },
  { key: "not_doing", label: "Not doing", pill: "bg-neutral-200 text-neutral-600" },
];

const ROLE_LABEL: Record<string, string> = { worker: "Worker", supervisor: "Supervisor", admin: "Admin" };

export default function SuggestionsPage() {
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [tab, setTab] = useState<Status | "all">("new");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/suggestions")
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load the suggestions.");
        return r.json();
      })
      .then((d) => setItems(d.suggestions))
      .catch((e) => setError(e.message));
  }, []);

  const count = (s: Status | "all") => (items ? (s === "all" ? items.length : items.filter((i) => i.status === s).length) : null);
  const shown = items ? (tab === "all" ? items : items.filter((i) => i.status === tab)) : [];
  const tabs: { key: Status | "all"; label: string }[] = [...STATUSES, { key: "all", label: "All" }];

  return (
    <StaffShell
      role="admin"
      active="/admin/suggestions"
      title="Suggestions"
      subtitle="Ideas from workers and supervisors"
      icon="idea"
    >
      <p className="text-sm text-neutral-600 mb-4 leading-relaxed">
        Anyone can send an idea with the “Suggest an idea” button on the worker page or the supervisor dashboard. The JSAFE
        team reads every one and marks it Planned, Done or Not doing.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 mb-4 md:mx-0 md:px-0">
        {tabs.map((t) => {
          const n = count(t.key);
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border ${
                on ? "bg-emerald-700 border-emerald-700 text-white font-semibold" : "bg-white border-neutral-300 text-neutral-700"
              }`}
            >
              {t.label}
              {n !== null && (
                <span className={`text-[11px] font-bold px-1.5 rounded-full ${on ? "bg-white/25 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-800">{error}</p>
      )}

      {!items && !error && (
        <div className="space-y-3 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-neutral-200" />
          ))}
        </div>
      )}

      {items && shown.length === 0 && (
        <p className="p-6 text-center text-sm text-neutral-500 bg-white rounded-2xl border border-neutral-200">
          {tab === "new" ? "No new suggestions. You're all caught up." : "Nothing here."}
        </p>
      )}

      <ul className="space-y-3">
        {shown.map((s) => (
          <SuggestionCard key={s.id} item={s} />
        ))}
      </ul>
    </StaffShell>
  );
}

function SuggestionCard({ item }: { item: Suggestion }) {
  const status = STATUSES.find((s) => s.key === item.status) ?? STATUSES[0];
  const when = new Date(item.createdAt).toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <li className={`bg-white rounded-2xl border shadow-sm p-4 ${item.status === "new" ? "border-blue-200" : "border-neutral-200"}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-neutral-500">
          <span className="font-semibold text-neutral-800">{item.name || "No name"}</span>
          {" · "}
          {ROLE_LABEL[item.role] ?? item.role}
          {" · "}
          {when}
        </p>
        <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${status.pill}`}>{status.label}</span>
      </div>

      <p className="mt-2 text-sm text-neutral-900 whitespace-pre-wrap break-words leading-relaxed">{item.text}</p>

      {item.adminNote && (
        <p className="mt-3 rounded-xl bg-neutral-50 border border-neutral-200 px-3 py-2 text-sm text-neutral-700 break-words">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Note </span>
          {item.adminNote}
        </p>
      )}
    </li>
  );
}
