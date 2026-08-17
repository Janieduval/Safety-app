"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HAZARD_QUESTIONS, RISK_RATINGS } from "@/lib/constants";

const HAZARD_LABELS: Record<string, string> = Object.fromEntries(
  HAZARD_QUESTIONS.map((q) => [q.key, q.label])
);

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

export default function HazardTemplatesPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/hazard-templates")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setTemplates(data.templates))
      .catch(() => setError("Could not load saved hazard answers."));
  };

  useEffect(() => {
    load();
  }, []);

  const update = async (id: string, patch: Partial<Template>) => {
    await fetch(`/api/admin/hazard-templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    load();
  };

  const visible = (templates ?? []).filter((t) => filter === "all" || t.needsReview);
  const pendingCount = (templates ?? []).filter((t) => t.needsReview).length;

  return (
    <main className="min-h-dvh bg-neutral-50 px-4 py-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-neutral-900">Saved hazard answers</h1>
        <Link href="/admin/dashboard" className="text-sm text-emerald-700 font-medium">
          ← Dashboard
        </Link>
      </div>

      <p className="text-sm text-neutral-600 mb-4">
        Workers can save a hazard and its controls as a reusable answer for their team, so
        recurring hazards don't need retyping from scratch every day. New ones are visible to
        the team immediately — review and tidy up the wording here, or remove ones that aren't
        useful.
      </p>

      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 rounded-full text-sm font-medium border ${
            filter === "pending"
              ? "bg-neutral-900 text-white border-neutral-900"
              : "bg-white text-neutral-700 border-neutral-300"
          }`}
        >
          Pending review ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium border ${
            filter === "all"
              ? "bg-neutral-900 text-white border-neutral-900"
              : "bg-white text-neutral-700 border-neutral-300"
          }`}
        >
          All ({(templates ?? []).length})
        </button>
      </div>

      {error && <p className="text-red-700 text-sm font-medium mb-4">{error}</p>}

      {templates === null && !error && (
        <p className="text-neutral-500 text-sm">Loading...</p>
      )}

      {templates !== null && visible.length === 0 && (
        <p className="text-neutral-500 text-sm">
          {filter === "pending" ? "Nothing pending review." : "No saved answers yet."}
        </p>
      )}

      <div className="space-y-3">
        {visible.map((t) => (
          <TemplateRow key={t.id} template={t} onUpdate={update} />
        ))}
      </div>
    </main>
  );
}

function TemplateRow({
  template,
  onUpdate,
}: {
  template: Template;
  onUpdate: (id: string, patch: Partial<Template>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(template.description);
  const [controls, setControls] = useState(template.controls);
  const [initialRisk, setInitialRisk] = useState(template.initialRisk);
  const [residualRisk, setResidualRisk] = useState(template.residualRisk);

  const saveEdits = () => {
    onUpdate(template.id, { description, controls, initialRisk, residualRisk });
    setEditing(false);
  };

  const cancelEdits = () => {
    setDescription(template.description);
    setControls(template.controls);
    setInitialRisk(template.initialRisk);
    setResidualRisk(template.residualRisk);
    setEditing(false);
  };

  return (
    <div
      className={`border rounded-lg p-4 ${
        template.needsReview ? "bg-amber-50 border-amber-300" : "bg-white border-neutral-200"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700">
            {template.team.label}
          </span>
          <span className="text-xs text-neutral-500">
            {HAZARD_LABELS[template.questionKey] ?? template.questionKey}
          </span>
        </div>
        {template.needsReview && (
          <span className="text-xs font-semibold text-amber-700">PENDING REVIEW</span>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Hazard description"
          />
          <textarea
            value={controls}
            onChange={(e) => setControls(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Controls"
          />
          <div className="flex gap-3">
            <label className="text-xs text-neutral-600 flex-1">
              Initial risk
              <select
                value={initialRisk}
                onChange={(e) => setInitialRisk(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 mt-0.5 bg-white text-sm capitalize"
              >
                {RISK_RATINGS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-neutral-600 flex-1">
              Residual risk
              <select
                value={residualRisk}
                onChange={(e) => setResidualRisk(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 mt-0.5 bg-white text-sm capitalize"
              >
                {RISK_RATINGS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-neutral-900">{template.description}</p>
          <p className="text-sm text-neutral-600 mt-1">Controls: {template.controls}</p>
          <p className="text-xs text-neutral-500 mt-1 capitalize">
            Initial risk: {template.initialRisk} → Residual risk: {template.residualRisk}
          </p>
        </>
      )}

      <p className="text-xs text-neutral-400 mt-2">
        {template.createdByWorker?.name ? `Saved by ${template.createdByWorker.name}` : "Saved"} ·{" "}
        {new Date(template.createdAt).toLocaleDateString("en-AU")}
      </p>

      <div className="flex gap-2 mt-3">
        {editing ? (
          <>
            <button
              type="button"
              onClick={saveEdits}
              className="text-xs px-3 py-1.5 rounded-full bg-emerald-700 text-white font-medium"
            >
              Save changes
            </button>
            <button
              type="button"
              onClick={cancelEdits}
              className="text-xs px-3 py-1.5 rounded-full border border-neutral-300 text-neutral-700"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs px-3 py-1.5 rounded-full border border-neutral-300 text-neutral-700"
          >
            Edit
          </button>
        )}
        {template.needsReview && (
          <button
            type="button"
            onClick={() => onUpdate(template.id, { needsReview: false })}
            className="text-xs px-3 py-1.5 rounded-full border border-emerald-600 text-emerald-700 font-medium"
          >
            Approve
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (confirm("Remove this saved answer? It will no longer be suggested to workers."))
              onUpdate(template.id, { active: false });
          }}
          className="text-xs px-3 py-1.5 rounded-full border border-neutral-300 text-neutral-700 ml-auto"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
