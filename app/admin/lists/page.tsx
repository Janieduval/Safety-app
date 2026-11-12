"use client";

import { useEffect, useState } from "react";
import StaffShell from "@/components/StaffShell";

// Site lists: the Teams, SWMS, PPE and Permits workers pick from in a Take 5.

type ListKey = "teams" | "swms" | "ppe" | "permits";
type Item = { id: string; label: string; active: boolean; uses: number; preselected?: boolean };
type Lists = Record<ListKey, Item[]>;

const TABS: { key: ListKey; label: string; noun: string; hint: string; example: string }[] = [
  {
    key: "teams",
    label: "Teams",
    noun: "team",
    hint: "The teams workers choose from at the start of a Take 5. Supervisors also pick their teams from this list.",
    example: "e.g. Piling",
  },
  {
    key: "swms",
    label: "SWMS",
    noun: "SWMS",
    hint: "The SWMS workers can tick as relevant to their task.",
    example: "e.g. Manual handling",
  },
  {
    key: "ppe",
    label: "PPE",
    noun: "PPE item",
    hint: "The PPE workers confirm they're wearing for their task.",
    example: "e.g. Hard hat",
  },
  {
    key: "permits",
    label: "Permits",
    noun: "permit",
    hint: "The permits workers can select when their task needs one.",
    example: "e.g. Hot works permit",
  },
];

export default function SiteListsPage() {
  const [lists, setLists] = useState<Lists | null>(null);
  const [tab, setTab] = useState<ListKey>("teams");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/lists")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setLists)
      .catch(() => setError("Could not load the lists."));
  }, []);

  // Sends a change; the server answers with the updated lists.
  const send = async (method: "POST" | "PATCH" | "DELETE", body: object): Promise<string | null> => {
    try {
      const res = await fetch("/api/admin/lists", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list: tab, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error ?? "Something went wrong. Try again.";
      setLists(data);
      return null;
    } catch {
      return "No connection. Try again.";
    }
  };

  const info = TABS.find((t) => t.key === tab)!;
  const items = lists?.[tab] ?? [];
  const shown = items.filter((i) => i.active);
  const removed = items.filter((i) => !i.active);

  return (
    <StaffShell
      role="admin"
      active="/admin/lists"
      title="Site lists"
      subtitle="Teams, SWMS, PPE and permits"
      icon="list"
    >
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-white border border-neutral-200 shadow-sm mb-4">
        {TABS.map((t) => {
          const n = lists ? lists[t.key].filter((i) => i.active).length : null;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 min-w-0 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === t.key ? "bg-emerald-700 text-white shadow" : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {t.label}
              {n !== null && (
                <span className={`ml-1 text-[11px] ${tab === t.key ? "text-emerald-100" : "text-neutral-400"}`}>{n}</span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-neutral-600 mb-4 leading-relaxed">{info.hint}</p>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-800">{error}</p>
      )}

      {!lists && !error && (
        <div className="space-y-2 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 bg-white rounded-2xl border border-neutral-200" />
          ))}
        </div>
      )}

      {lists && (
        <>
          <AddBox key={tab} noun={info.noun} example={info.example} onAdd={(label) => send("POST", { label })} />

          <ul className="mt-4 bg-white rounded-2xl border border-neutral-200 shadow-sm divide-y divide-neutral-100 overflow-hidden">
            {shown.map((item) => (
              <Row
                key={item.id}
                item={item}
                onRename={(label) => send("PATCH", { id: item.id, label })}
                onRemove={() => send("DELETE", { id: item.id })}
              />
            ))}
          </ul>
          {shown.length <= 1 && (
            <p className="mt-3 text-sm text-neutral-500 text-center">
              Nothing here yet — add the first {info.noun} above.
            </p>
          )}

          {removed.length > 0 && (
            <section className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Removed</h2>
              <p className="text-xs text-neutral-500 mb-2">
                Hidden from new Take 5s, but still shown on the Take 5s that used them.
              </p>
              <ul className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
                {removed.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex-1 min-w-0 text-sm text-neutral-500 line-through truncate">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => send("PATCH", { id: item.id, active: true })}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-emerald-600 text-emerald-700 font-semibold hover:bg-emerald-50"
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </StaffShell>
  );
}

function AddBox({
  noun,
  example,
  onAdd,
}: {
  noun: string;
  example: string;
  onAdd: (label: string) => Promise<string | null>;
}) {
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const add = async () => {
    if (!label.trim() || busy) return;
    setBusy(true);
    const err = await onAdd(label);
    setBusy(false);
    setMsg(err);
    if (!err) setLabel("");
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4">
      <p className="text-sm font-semibold text-neutral-900">Add a {noun}</p>
      <div className="mt-2 flex gap-2">
        <input
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setMsg(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={example}
          className="flex-1 min-w-0 rounded-xl border border-neutral-300 px-3 py-2 bg-white text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={!label.trim() || busy}
          className="shrink-0 text-sm px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-50"
        >
          {busy ? "Adding…" : "+ Add"}
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-red-700">{msg}</p>}
    </div>
  );
}

function Row({
  item,
  onRename,
  onRemove,
}: {
  item: Item;
  onRename: (label: string) => Promise<string | null>;
  onRemove: () => Promise<string | null>;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "remove">("view");
  const [label, setLabel] = useState(item.label);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const isOther = item.label === "Other";

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    const err = await fn();
    setBusy(false);
    setMsg(err);
    return err;
  };

  if (mode === "edit") {
    return (
      <li className="px-4 py-3 bg-emerald-50/40">
        <div className="flex gap-2">
          <input
            value={label}
            autoFocus
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && !(await run(() => onRename(label)))) setMode("view");
              if (e.key === "Escape") setMode("view");
            }}
            className="flex-1 min-w-0 rounded-xl border border-neutral-300 px-3 py-2 bg-white text-sm"
          />
          <button
            type="button"
            disabled={busy || !label.trim()}
            onClick={async () => {
              if (!(await run(() => onRename(label)))) setMode("view");
            }}
            className="shrink-0 text-sm px-3 py-2 rounded-xl bg-emerald-700 text-white font-semibold disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setLabel(item.label);
              setMsg(null);
              setMode("view");
            }}
            className="shrink-0 text-sm px-3 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-700"
          >
            Cancel
          </button>
        </div>
        {item.uses > 0 && (
          <p className="mt-1.5 text-xs text-neutral-500">The new name also shows on the {item.uses} Take 5s that used it.</p>
        )}
        {msg && <p className="mt-1.5 text-sm text-red-700">{msg}</p>}
      </li>
    );
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-900 break-words">{item.label}</p>
          <p className="text-xs text-neutral-500">
            {isOther
              ? "Always available — lets workers type their own"
              : item.uses > 0
              ? `Used ${item.uses} time${item.uses === 1 ? "" : "s"}`
              : "Not used yet"}
          </p>
        </div>
        {!isOther && mode === "view" && (
          <div className="shrink-0 flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                setLabel(item.label);
                setMode("edit");
              }}
              className="text-xs px-3 py-1.5 rounded-full border border-neutral-300 bg-white text-neutral-700 font-semibold hover:bg-neutral-50"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={() => setMode("remove")}
              className="text-xs px-3 py-1.5 rounded-full border border-red-200 bg-white text-red-700 font-semibold hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        )}
        {isOther && (
          <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">Fixed</span>
        )}
      </div>

      {mode === "remove" && (
        <div className="mt-2 rounded-xl border-2 border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-900">Remove &quot;{item.label}&quot;?</p>
          <p className="text-xs text-red-800 mt-0.5">
            {item.uses > 0
              ? "It won't be offered on new Take 5s. The Take 5s that used it keep it, and you can restore it later."
              : "It hasn't been used yet, so it will be deleted."}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(onRemove)}
              className="text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold disabled:opacity-50"
            >
              Yes, remove
            </button>
            <button
              type="button"
              onClick={() => setMode("view")}
              className="text-sm px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-700"
            >
              Keep
            </button>
          </div>
        </div>
      )}
      {msg && <p className="mt-1.5 text-sm text-red-700">{msg}</p>}
    </li>
  );
}
