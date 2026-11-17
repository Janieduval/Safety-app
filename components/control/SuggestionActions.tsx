"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// On the control centre's Suggestions page: mark a suggestion Planned, Done or
// Not doing, add a note, or delete it. The change is saved on the site it
// came from, where its admins can see the status and note.

const STATUSES = [
  { key: "new", label: "New" },
  { key: "planned", label: "Planned" },
  { key: "done", label: "Done" },
  { key: "not_doing", label: "Not doing" },
];

export default function SuggestionActions({
  siteId,
  id,
  status,
  adminNote,
}: {
  siteId: string;
  id: string;
  status: string;
  adminNote: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(adminNote ?? "");
  const [removing, setRemoving] = useState(false);

  const send = async (method: "PATCH" | "DELETE", body: object): Promise<boolean> => {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/control/suggestions", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, id, ...body }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res || !res.ok) {
      setMsg(data?.error ?? "No connection. Try again.");
      return false;
    }
    router.refresh();
    return true;
  };

  return (
    <div className="mt-2.5">
      {editing ? (
        <div>
          <textarea
            value={note}
            autoFocus
            rows={2}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Added to Site lists → Permits"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-sm"
          />
          <p className="text-xs text-neutral-500">The site&apos;s admins can see this note.</p>
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (await send("PATCH", { adminNote: note })) setEditing(false);
              }}
              className="text-sm px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold disabled:opacity-50"
            >
              Save note
            </button>
            <button
              type="button"
              onClick={() => {
                setNote(adminNote ?? "");
                setEditing(false);
              }}
              className="text-sm px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        adminNote && (
          <p className="rounded-xl bg-neutral-50 border border-neutral-200 px-3 py-2 text-sm text-neutral-700 break-words">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Note </span>
            {adminNote}
          </p>
        )
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s.key}
            type="button"
            disabled={busy || s.key === status}
            onClick={() => send("PATCH", { status: s.key })}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
              s.key === status
                ? "bg-emerald-700 text-white"
                : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            }`}
          >
            {s.label}
          </button>
        ))}
        <span className="flex-1" />
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs px-3 py-1.5 rounded-full border border-neutral-300 bg-white text-neutral-700 font-semibold hover:bg-neutral-50"
          >
            {adminNote ? "Edit note" : "Add note"}
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
          <p className="text-xs text-red-800 mt-0.5">It&apos;s removed from the site too, and can&apos;t be undone. To keep it but put it aside, use Not doing.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (await send("DELETE", {})) setRemoving(false);
              }}
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
      {msg && <p className="mt-2 text-sm font-medium text-red-700">{msg}</p>}
    </div>
  );
}
