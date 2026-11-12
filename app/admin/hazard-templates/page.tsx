"use client";

import { useEffect, useState } from "react";
import StaffShell from "@/components/StaffShell";
import { HAZARD_QUESTIONS, RISK_RATINGS } from "@/lib/constants";

// Saved answers: hazards and controls workers saved for their team, so they
// don't retype recurring hazards every day. Admins check, tidy, approve or remove them.

const HAZARD_LABELS: Record<string, string> = Object.fromEntries(
  HAZARD_QUESTIONS.map((q) => [q.key, q.label])
);

const RISK_PILL: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  extreme: "bg-red-100 text-red-800",
};

type Template = {
  id: string;
  teamId: string;
  team: { label: string };
  questionKey: string;
  description: string;
  controls: string;
  initialRisk: string;
  residualRisk: string;
  needsReview: boolean;
  active?: boolean;
  createdByWorker?: { name: string } | null;
  createdAt: string;
};

function RiskPill({ risk }: { risk: string }) {
  return (
    <span className={`text-[11px] font-semibold capitalize px-2 py-0.5 rounded-full ${RISK_PILL[risk] ?? "bg-neutral-100 text-neutral-600"}`}>
      {risk}
    </span>
  );
}

export default function HazardTemplatesPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [team, setTeam] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/hazard-templates")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setTemplates(data.templates))
      .catch(() => setError("Could not load saved answers."));
  };

  useEffect(() => {
    load();
  }, []);

  const update = async (id: string, patch: Partial<Template>) => {
    // Show the change straight away, then save it.
    setTemplates((prev) =>
      (prev ?? [])
        .map((t) => (t.id === id ? { ...t, ...patch } : t))
        .filter((t) => t.active !== false)
    );
    const res = await fetch(`/api/admin/hazard-templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => null);
    if (!res || !res.ok) {
      setError("That change didn't save. Check your connection and try again.");
      load();
    }
  };

  const all = templates ?? [];
  const pendingCount = all.filter((t) => t.needsReview).length;
  const teams = Array.from(new Set(all.map((t) => t.team.label))).sort();
  const term = search.trim().toLowerCase();
  const visible = all.filter(
    (t) =>
      (filter === "all" || t.needsReview) &&
      (!team || t.team.label === team) &&
      (!term || `${t.description} ${t.controls}`.toLowerCase().includes(term))
  );

  return (
    <StaffShell
      role="admin"
      active="/admin/hazard-templates"
      title="Saved answers"
      subtitle="Reusable hazards & controls"
      icon="saved"
    >
      <p className="text-sm text-neutral-600 mb-4 leading-relaxed">
        Workers can save a hazard and its controls for their team, so recurring hazards don&apos;t need
        retyping every day. New ones show to the team straight away and wait here for you — check the
        wording and risk ratings, then approve, edit or remove them.
      </p>

      {/* To review | All */}
      <div className="flex gap-1 p-1 rounded-2xl bg-white border border-neutral-200 shadow-sm mb-3">
        {(
          [
            ["pending", "To review", pendingCount],
            ["all", "All", all.length],
          ] as const
        ).map(([key, label, n]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              filter === key ? "bg-emerald-700 text-white shadow" : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {label}
            <span className={`ml-1 text-[11px] ${filter === key ? "text-emerald-100" : "text-neutral-400"}`}>{n}</span>
          </button>
        ))}
      </div>

      {/* Team + search */}
      {all.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="rounded-xl border border-neutral-300 px-3 py-2 bg-white text-sm sm:w-56"
          >
            <option value="">All teams</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hazards or controls..."
            className="flex-1 min-w-0 rounded-xl border border-neutral-300 px-3 py-2 bg-white text-sm"
          />
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-800">{error}</p>
      )}

      {templates === null && !error && (
        <div className="space-y-3 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 bg-white rounded-2xl border border-neutral-200" />
          ))}
        </div>
      )}

      {templates !== null && visible.length === 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-neutral-800">
            {filter === "pending" && !team && !term ? "Nothing waiting for review." : "No saved answers here."}
          </p>
          {filter === "pending" && all.length > 0 && (
            <button type="button" onClick={() => setFilter("all")} className="mt-2 text-sm font-semibold text-emerald-700">
              See all {all.length} →
            </button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {visible.map((t) => (
          <TemplateCard key={t.id} template={t} onUpdate={update} />
        ))}
      </div>
    </StaffShell>
  );
}

function TemplateCard({
  template,
  onUpdate,
}: {
  template: Template;
  onUpdate: (id: string, patch: Partial<Template>) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "remove">("view");
  const [description, setDescription] = useState(template.description);
  const [controls, setControls] = useState(template.controls);
  const [initialRisk, setInitialRisk] = useState(template.initialRisk);
  const [residualRisk, setResidualRisk] = useState(template.residualRisk);
  const pending = template.needsReview;

  const startEdit = () => {
    setDescription(template.description);
    setControls(template.controls);
    setInitialRisk(template.initialRisk);
    setResidualRisk(template.residualRisk);
    setMode("edit");
  };

  const save = () => {
    if (!description.trim()) return;
    onUpdate(template.id, { description: description.trim(), controls: controls.trim(), initialRisk, residualRisk });
    setMode("view");
  };

  return (
    <div
      className={`rounded-2xl border shadow-sm p-4 ${
        pending ? "bg-amber-50/60 border-amber-300" : "bg-white border-neutral-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
          {template.team.label}
        </span>
        {pending && (
          <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            To review
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs text-neutral-500">{HAZARD_LABELS[template.questionKey] ?? template.questionKey}</p>

      {mode === "edit" ? (
        <div className="mt-2 space-y-2">
          <label className="block text-xs font-semibold text-neutral-600">
            Hazard
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm font-normal bg-white"
            />
          </label>
          <label className="block text-xs font-semibold text-neutral-600">
            Controls
            <textarea
              value={controls}
              onChange={(e) => setControls(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm font-normal bg-white"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["Initial risk", initialRisk, setInitialRisk],
                ["Residual risk", residualRisk, setResidualRisk],
              ] as const
            ).map(([label, value, set]) => (
              <label key={label} className="block text-xs font-semibold text-neutral-600">
                {label}
                <select
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-2 py-2 bg-white text-sm font-normal capitalize"
                >
                  {RISK_RATINGS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm font-semibold text-neutral-900 break-words">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Hazard </span>
            {template.description}
          </p>
          {template.controls && (
            <p className="mt-1 text-sm text-neutral-700 break-words whitespace-pre-line">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Controls </span>
              {template.controls}
            </p>
          )}
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="text-neutral-500">Initial</span>
            <RiskPill risk={template.initialRisk} />
            <span className="text-neutral-400">→</span>
            <span className="text-neutral-500">Residual</span>
            <RiskPill risk={template.residualRisk} />
          </div>
        </>
      )}

      <p className="mt-2 text-xs text-neutral-400">
        {template.createdByWorker?.name ? `Saved by ${template.createdByWorker.name}` : "Saved"} ·{" "}
        {new Date(template.createdAt).toLocaleDateString("en-AU")}
      </p>

      <div className="mt-3 pt-3 border-t border-neutral-200/70 flex flex-wrap items-center gap-2">
        {mode === "edit" ? (
          <>
            <button
              type="button"
              onClick={save}
              disabled={!description.trim()}
              className="text-xs px-3 py-1.5 rounded-full bg-emerald-700 text-white font-semibold disabled:opacity-50"
            >
              Save changes
            </button>
            <button
              type="button"
              onClick={() => setMode("view")}
              className="text-xs px-3 py-1.5 rounded-full border border-neutral-300 bg-white text-neutral-700"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            {pending && (
              <button
                type="button"
                onClick={() => onUpdate(template.id, { needsReview: false })}
                className="text-xs px-3 py-1.5 rounded-full bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
              >
                Approve
              </button>
            )}
            <button
              type="button"
              onClick={startEdit}
              className="text-xs px-3 py-1.5 rounded-full border border-neutral-300 bg-white text-neutral-700 font-semibold hover:bg-neutral-50"
            >
              Edit
            </button>
          </>
        )}
        {mode === "remove" ? (
          <span className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => onUpdate(template.id, { active: false })}
              className="text-xs px-3 py-1.5 rounded-full bg-red-600 text-white font-semibold"
            >
              Yes, remove
            </button>
            <button
              type="button"
              onClick={() => setMode("view")}
              className="text-xs px-3 py-1.5 rounded-full border border-neutral-300 bg-white text-neutral-700"
            >
              Keep
            </button>
          </span>
        ) : (
          mode === "view" && (
            <button
              type="button"
              onClick={() => setMode("remove")}
              className="ml-auto text-xs px-3 py-1.5 rounded-full border border-red-200 bg-white text-red-700 font-semibold hover:bg-red-50"
            >
              Remove
            </button>
          )
        )}
      </div>
    </div>
  );
}
