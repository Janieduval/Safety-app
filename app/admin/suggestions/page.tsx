"use client";

import { useEffect, useState } from "react";
import StaffShell from "@/components/StaffShell";

// Suggestions: ideas sent from the "Suggest an idea" button by workers,
// supervisors and admins. Mark each one as you go.

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
        if (r.status === 403) throw new Error("Only the site owner can see suggestions.");
        if (!r.ok) throw new Error("Could not load the suggestions.");
        return r.json();
      })
      .then((d) => setItems(d.suggestions))
      .catch((e) => setError(e.message));
  }, []);

  // Sends a change; the server answers with the updated list.
  const send = async (method: "PATCH" | "DELETE", body: object): Promise<string | null> => {
    try {
      const res = await fetch("/api/admin/suggestions", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error ?? "Something went wrong. Try again.";
      setItems(data.suggestions);
      return null;
    } catch {
      return "No connection. Try again.";
    }
  };

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
        Anyone can send an idea with the “Suggest an idea” button on the worker page or the supervisor dashboard. Mark each
        one as Planned, Done or Not doing as you go.
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
          <SuggestionCard
            key={s.id}
            item={s}
            onStatus={(status) => send("PATCH", { id: s.id, status })}
            onNote={(adminNote) => send("PATCH", { id: s.id, adminNote })}
            onDelete={() => send("DELETE", { id: s.id })}
          />
        ))}
      </ul>
    </StaffShell>
  );
}

function SuggestionCard({
  item,
  onStatus,
  onNote,
  onDelete,
}: {
  item: Suggestion;
  onStatus: (s: Status) => Promise<string | null>;
  onNote: (note: string) => Promise<string | null>;
  onDelete: () => Promise<string | null>;
}) {
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState(item.adminNote ?? "");
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    const err = await fn();
    setBusy(false);
    setMsg(err);
    return err;
  };

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

      {/* Your note */}
      {editingNote ? (
        <div className="mt-3">
          <textarea
            value={note}
            autoFocus
            rows={2}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
            placeholder="A note for yourself, e.g. what you changed"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-sm"
          />
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!(await run(() => onNote(note)))) setEditingNote(false);
              }}
              className="text-sm px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold disabled:opacity-50"
            >
              Save note
            </button>
            <button
              type="button"
              onClick={() => {
                setNote(item.adminNote ?? "");
                setEditingNote(false);
              }}
              className="text-sm px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        item.adminNote && (
          <p className="mt-3 rounded-xl bg-neutral-50 border border-neutral-200 px-3 py-2 text-sm text-neutral-700 break-words">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Note </span>
            {item.adminNote}
          </p>
        )
      )}

      {/* Status buttons */}
      <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap items-center gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s.key}
            type="button"
            disabled={busy || s.key === item.status}
            onClick={() => run(() => onStatus(s.key))}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
              s.key === item.status
                ? "bg-emerald-700 text-white"
                : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            }`}
          >
            {s.label}
          </button>
        ))}
        <span className="flex-1" />
        {!editingNote && (
          <button
            type="button"
            onClick={() => setEditingNote(true)}
            className="text-xs px-3 py-1.5 rounded-full border border-neutral-300 bg-white text-neutral-700 font-semibold hover:bg-neutral-50"
          >
            {item.adminNote ? "Edit note" : "Add note"}
          </button>
        )}
        {!removing && (
          <button
            type="button"
            onClick={() => setRemoving(true)}
            className="text-xs px-3 py-1.5 rounded-full border border-red-200 bg-white text-red-700 font-semibold hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </div>

      {removing && (
        <div className="mt-2 rounded-xl border-2 border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-900">Delete this suggestion?</p>
          <p className="text-xs text-red-800 mt-0.5">It can&apos;t be undone. To keep it but put it aside, use Not doing.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(onDelete)}
              className="text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold disabled:opacity-50"
            >
              Yes, delete
            </button>
            <button
              type="button"
              onClick={() => setRemoving(false)}
              className="text-sm px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-700"
            >
              Keep
            </button>
          </div>
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-red-700">{msg}</p>}
    </li>
  );
}
