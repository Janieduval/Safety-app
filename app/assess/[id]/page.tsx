"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAssessmentData, useAutosave } from "@/lib/useAssessment";
import AutosaveStatus from "@/components/AutosaveStatus";
import YesNoButtons from "@/components/YesNoButtons";
import StopWorkWarning from "@/components/StopWorkWarning";
import SignaturePad from "@/components/SignaturePad";
import {
  STEP1_QUESTIONS,
  STOP_WORK_WARNING,
  HAZARD_QUESTIONS,
  FINAL_DECLARATIONS,
  CHANGE_CATEGORIES,
  RISK_RATINGS,
} from "@/lib/constants";

const STEPS = [
  "header",
  "step1",
  "swms",
  "ppe",
  "permits",
  "access",
  "changes",
  "hazards",
  "newHazard",
  "declarations",
  "sign",
  "review",
] as const;

export default function AssessmentWizard({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { assessment, project, teams, loading, error, reload } = useAssessmentData(id);
  const { save, status } = useAutosave(id);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Warn before refresh/navigation while a draft is in progress
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (assessment && assessment.status === "draft") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [assessment]);

  if (loading) return <CenteredMessage text="Loading assessment..." />;
  if (error) return <CenteredMessage text={error} isError />;
  if (!assessment || !project) return <CenteredMessage text="Assessment not found." isError />;

  const readOnly = assessment.status !== "draft" && assessment.status !== "changes_required";
  const step = STEPS[stepIndex];

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitErrors([]);
    try {
      const res = await fetch(`/api/assessments/${id}/submit`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setSubmitErrors(body.errors ?? ["Could not submit assessment."]);
        return;
      }
      await reload();
      router.push(`/assess/${id}/sign`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-neutral-50 pb-24">
      <header className="sticky top-0 bg-white border-b border-neutral-200 px-4 py-3 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500">{project.name}</p>
            <p className="text-sm font-semibold text-neutral-800">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
          </div>
          <AutosaveStatus status={status} />
        </div>
        <div className="max-w-md mx-auto mt-2 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-700 transition-all"
            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-5">
        {readOnly && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-300 p-3 text-amber-800 text-sm font-medium">
            This assessment is {assessment.status.replace(/_/g, " ")} and can no longer be
            edited here.
          </div>
        )}

        {step === "header" && (
          <HeaderStep assessment={assessment} teams={teams} save={save} readOnly={readOnly} />
        )}
        {step === "step1" && (
          <Step1 assessment={assessment} save={save} readOnly={readOnly} />
        )}
        {step === "swms" && (
          <SwmsStep assessment={assessment} project={project} save={save} readOnly={readOnly} />
        )}
        {step === "ppe" && (
          <PpeStep assessment={assessment} project={project} save={save} readOnly={readOnly} />
        )}
        {step === "permits" && (
          <PermitsStep
            assessment={assessment}
            project={project}
            save={save}
            readOnly={readOnly}
          />
        )}
        {step === "access" && (
          <AccessStep assessment={assessment} save={save} readOnly={readOnly} />
        )}
        {step === "changes" && (
          <ChangesStep assessment={assessment} save={save} reload={reload} readOnly={readOnly} />
        )}
        {step === "hazards" && (
          <HazardsStep assessment={assessment} save={save} reload={reload} readOnly={readOnly} />
        )}
        {step === "newHazard" && (
          <NewHazardStep assessment={assessment} save={save} readOnly={readOnly} />
        )}
        {step === "declarations" && (
          <DeclarationsStep assessment={assessment} save={save} readOnly={readOnly} />
        )}
        {step === "sign" && (
          <PrimarySignStep assessment={assessment} reload={reload} readOnly={readOnly} />
        )}
        {step === "review" && (
          <ReviewStep
            assessment={assessment}
            submitErrors={submitErrors}
            onSubmit={handleSubmit}
            submitting={submitting}
            readOnly={readOnly}
          />
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-4 py-3">
        <div className="max-w-md mx-auto flex gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 0}
            className="flex-1 py-3 rounded-lg border border-neutral-400 font-medium text-neutral-700 disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={stepIndex === STEPS.length - 1}
            className="flex-1 py-3 rounded-lg bg-emerald-700 text-white font-semibold disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      </nav>
    </main>
  );
}

function CenteredMessage({ text, isError }: { text: string; isError?: boolean }) {
  return (
    <div className="min-h-dvh flex items-center justify-center px-6">
      <p className={`text-center ${isError ? "text-red-700" : "text-neutral-600"}`}>{text}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-neutral-900 mb-3">{children}</h2>;
}

// ---------------- Header ----------------

function HeaderStep({ assessment, teams, save, readOnly }: any) {
  const [local, setLocal] = useState({
    dateTime: assessment.dateTime?.slice(0, 16) ?? "",
    teamId: assessment.teamId ?? "",
    otherTeamText: assessment.otherTeamText ?? "",
    location: assessment.location ?? "",
    taskDescription: assessment.taskDescription ?? "",
  });

  const isOtherTeam = useMemo(
    () => teams.find((t: any) => t.id === local.teamId)?.label === "Other",
    [local.teamId, teams]
  );

  const commit = (patch: Partial<typeof local>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    save("header", next);
  };

  return (
    <div className="space-y-5">
      <SectionTitle>Assessment details</SectionTitle>

      <Field label="Date and time">
        <input
          type="datetime-local"
          value={local.dateTime}
          disabled={readOnly}
          onChange={(e) => commit({ dateTime: e.target.value })}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3"
        />
      </Field>

      <Field label="Team">
        <select
          value={local.teamId}
          disabled={readOnly}
          onChange={(e) => commit({ teamId: e.target.value })}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 bg-white"
        >
          <option value="">Select a team...</option>
          {teams.map((t: any) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>

      {isOtherTeam && (
        <Field label="Please specify the team">
          <input
            type="text"
            value={local.otherTeamText}
            disabled={readOnly}
            onChange={(e) => commit({ otherTeamText: e.target.value })}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3"
          />
        </Field>
      )}

      <Field label="Location or work area">
        <input
          type="text"
          value={local.location}
          disabled={readOnly}
          onChange={(e) => commit({ location: e.target.value })}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3"
        />
      </Field>

      <Field label="Today's tasks">
        <textarea
          value={local.taskDescription}
          disabled={readOnly}
          onChange={(e) => commit({ taskDescription: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3"
        />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-neutral-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

// ---------------- Step 1 ----------------

function Step1({ assessment, save, readOnly }: any) {
  const [responses, setResponses] = useState<Record<string, any>>(() => {
    const map: Record<string, any> = {};
    for (const r of assessment.step1Responses) map[r.questionKey] = r;
    return map;
  });

  const setAnswer = (key: string, answer: boolean) => {
    const current = responses[key] ?? { questionKey: key };
    const next = { ...current, answer, noDetails: answer ? null : current.noDetails, spokenToSupervisor: answer ? false : current.spokenToSupervisor };
    setResponses((prev) => ({ ...prev, [key]: next }));
    save("step1", { questionKey: key, answer, noDetails: next.noDetails, spokenToSupervisor: next.spokenToSupervisor });
  };

  const setDetails = (key: string, field: "noDetails" | "spokenToSupervisor", value: any) => {
    const current = responses[key] ?? { questionKey: key };
    const next = { ...current, [field]: value };
    setResponses((prev) => ({ ...prev, [key]: next }));
    save("step1", {
      questionKey: key,
      answer: next.answer,
      noDetails: next.noDetails,
      spokenToSupervisor: next.spokenToSupervisor,
    });
  };

  return (
    <div className="space-y-6">
      <SectionTitle>Step 1 — Plan the task</SectionTitle>
      <p className="text-sm text-neutral-600 -mt-3">
        If you select No, stop and speak to your supervisor before continuing.
      </p>

      {STEP1_QUESTIONS.map((q) => {
        const r = responses[q.key];
        return (
          <div key={q.key} className="border border-neutral-200 rounded-lg p-4 bg-white">
            <p className="font-medium text-neutral-900 mb-3">{q.label}</p>
            <YesNoButtons
              value={r?.answer ?? null}
              disabled={readOnly}
              onChange={(v) => setAnswer(q.key, v)}
            />
            {r?.answer === false && (
              <div className="mt-3 space-y-3">
                <StopWorkWarning message={STOP_WORK_WARNING} />
                <Field label="Details">
                  <textarea
                    value={r.noDetails ?? ""}
                    disabled={readOnly}
                    onChange={(e) => setDetails(q.key, "noDetails", e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-800">
                  <input
                    type="checkbox"
                    checked={!!r.spokenToSupervisor}
                    disabled={readOnly}
                    onChange={(e) => setDetails(q.key, "spokenToSupervisor", e.target.checked)}
                    className="w-5 h-5"
                  />
                  I have spoken with my supervisor about this
                </label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------- SWMS ----------------

function SwmsStep({ assessment, project, save, readOnly }: any) {
  const [selected, setSelected] = useState<string[]>(
    assessment.swms.map((s: any) => s.swmsOptionId)
  );
  const [otherText, setOtherText] = useState(assessment.swmsOtherText ?? "");
  const [query, setQuery] = useState("");

  const isOtherSelected = project.swmsOptions.some(
    (o: any) => selected.includes(o.id) && o.label === "Other"
  );

  const toggle = (optionId: string) => {
    const next = selected.includes(optionId)
      ? selected.filter((x) => x !== optionId)
      : [...selected, optionId];
    setSelected(next);
    save("swms", { swmsOptionIds: next, otherText });
  };

  const filtered = project.swmsOptions.filter((o: any) =>
    o.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <SectionTitle>SWMS I work under</SectionTitle>
      <input
        type="text"
        placeholder="Search SWMS..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 px-4 py-3"
      />
      <div className="space-y-2">
        {filtered.map((o: any) => (
          <label
            key={o.id}
            className="flex items-center gap-3 border border-neutral-200 rounded-lg p-3 bg-white"
          >
            <input
              type="checkbox"
              checked={selected.includes(o.id)}
              disabled={readOnly}
              onChange={() => toggle(o.id)}
              className="w-5 h-5"
            />
            <span className="text-neutral-800">{o.label}</span>
          </label>
        ))}
      </div>
      {isOtherSelected && (
        <Field label="Please specify">
          <input
            type="text"
            value={otherText}
            disabled={readOnly}
            onChange={(e) => {
              setOtherText(e.target.value);
              save("swms", { swmsOptionIds: selected, otherText: e.target.value });
            }}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3"
          />
        </Field>
      )}
      {selected.length === 0 && (
        <p className="text-sm text-red-700 font-medium">
          At least one SWMS must be selected before this assessment can be submitted.
        </p>
      )}
    </div>
  );
}

// ---------------- PPE ----------------

function PpeStep({ assessment, project, save, readOnly }: any) {
  const [selected, setSelected] = useState<string[]>(() => {
    const existing = assessment.ppe.map((p: any) => p.ppeOptionId);
    if (existing.length > 0) return existing;
    // preselect standard site PPE on first load
    return project.ppeOptions.filter((o: any) => o.preselected).map((o: any) => o.id);
  });
  const [otherText, setOtherText] = useState(assessment.ppeOtherText ?? "");

  useEffect(() => {
    // persist the initial preselection once
    if (assessment.ppe.length === 0 && selected.length > 0) {
      save("ppe", { ppeOptionIds: selected, otherText });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isOtherSelected = project.ppeOptions.some(
    (o: any) => selected.includes(o.id) && o.label === "Other"
  );

  const toggle = (optionId: string) => {
    const next = selected.includes(optionId)
      ? selected.filter((x) => x !== optionId)
      : [...selected, optionId];
    setSelected(next);
    save("ppe", { ppeOptionIds: next, otherText });
  };

  return (
    <div className="space-y-4">
      <SectionTitle>PPE required for today's task</SectionTitle>
      <p className="text-sm text-neutral-600 -mt-3">
        Standard site PPE is preselected below — review and adjust for today's task.
      </p>
      <div className="space-y-2">
        {project.ppeOptions.map((o: any) => (
          <label
            key={o.id}
            className="flex items-center gap-3 border border-neutral-200 rounded-lg p-3 bg-white"
          >
            <input
              type="checkbox"
              checked={selected.includes(o.id)}
              disabled={readOnly}
              onChange={() => toggle(o.id)}
              className="w-5 h-5"
            />
            <span className="text-neutral-800">{o.label}</span>
          </label>
        ))}
      </div>
      {isOtherSelected && (
        <Field label="Please specify">
          <input
            type="text"
            value={otherText}
            disabled={readOnly}
            onChange={(e) => {
              setOtherText(e.target.value);
              save("ppe", { ppeOptionIds: selected, otherText: e.target.value });
            }}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3"
          />
        </Field>
      )}
    </div>
  );
}

// ---------------- Permits ----------------

function PermitsStep({ assessment, project, save, readOnly }: any) {
  const [required, setRequired] = useState<boolean>(assessment.permitRequired);
  const [otherText, setOtherText] = useState(assessment.permitOtherText ?? "");
  const [permits, setPermits] = useState<any[]>(
    assessment.permits.map((p: any) => ({
      permitTypeId: p.permitTypeId,
      referenceNumber: p.referenceNumber ?? "",
      issuedReviewedSigned: p.issuedReviewedSigned,
    }))
  );

  const persist = (next: { required?: boolean; otherText?: string; permits?: any[] }) => {
    const merged = {
      required: next.required ?? required,
      otherText: next.otherText ?? otherText,
      permits: next.permits ?? permits,
    };
    save("permits", merged);
  };

  const togglePermitType = (permitTypeId: string) => {
    const exists = permits.find((p) => p.permitTypeId === permitTypeId);
    const next = exists
      ? permits.filter((p) => p.permitTypeId !== permitTypeId)
      : [...permits, { permitTypeId, referenceNumber: "", issuedReviewedSigned: false }];
    setPermits(next);
    persist({ permits: next });
  };

  const updatePermit = (permitTypeId: string, patch: any) => {
    const next = permits.map((p) =>
      p.permitTypeId === permitTypeId ? { ...p, ...patch } : p
    );
    setPermits(next);
    persist({ permits: next });
  };

  const isOtherSelected = project.permitTypes.some(
    (o: any) => permits.some((p) => p.permitTypeId === o.id) && o.label === "Other"
  );

  return (
    <div className="space-y-4">
      <SectionTitle>Does today's task require a permit?</SectionTitle>
      <div className="flex gap-3">
        {[
          { label: "Required", value: true },
          { label: "Not required", value: false },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            disabled={readOnly}
            onClick={() => {
              setRequired(opt.value);
              persist({ required: opt.value });
            }}
            className={`flex-1 py-4 rounded-lg font-semibold border-2 ${
              required === opt.value
                ? "bg-emerald-700 border-emerald-700 text-white"
                : "bg-white border-neutral-300 text-neutral-800"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {required && (
        <div className="space-y-3">
          {project.permitTypes.map((o: any) => {
            const p = permits.find((x) => x.permitTypeId === o.id);
            return (
              <div key={o.id} className="border border-neutral-200 rounded-lg p-3 bg-white">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!p}
                    disabled={readOnly}
                    onChange={() => togglePermitType(o.id)}
                    className="w-5 h-5"
                  />
                  <span className="text-neutral-800 font-medium">{o.label}</span>
                </label>
                {p && (
                  <div className="mt-3 space-y-2 pl-8">
                    <input
                      type="text"
                      placeholder="Permit number / reference"
                      value={p.referenceNumber}
                      disabled={readOnly}
                      onChange={(e) =>
                        updatePermit(o.id, { referenceNumber: e.target.value })
                      }
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                    />
                    <label className="flex items-center gap-2 text-sm font-medium text-neutral-800">
                      <input
                        type="checkbox"
                        checked={p.issuedReviewedSigned}
                        disabled={readOnly}
                        onChange={(e) =>
                          updatePermit(o.id, { issuedReviewedSigned: e.target.checked })
                        }
                        className="w-5 h-5"
                      />
                      Permit has been issued, reviewed and signed
                    </label>
                  </div>
                )}
              </div>
            );
          })}
          {isOtherSelected && (
            <Field label="Please specify">
              <input
                type="text"
                value={otherText}
                disabled={readOnly}
                onChange={(e) => {
                  setOtherText(e.target.value);
                  persist({ otherText: e.target.value });
                }}
                className="w-full rounded-lg border border-neutral-300 px-4 py-3"
              />
            </Field>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- Access ----------------

function AccessStep({ assessment, save, readOnly }: any) {
  const [state, setState] = useState({
    safe: assessment.accessCheck?.safe ?? null,
    details: assessment.accessCheck?.details ?? "",
    controlMeasure: assessment.accessCheck?.controlMeasure ?? "",
  });

  const commit = (patch: Partial<typeof state>) => {
    const next = { ...state, ...patch };
    setState(next);
    save("accessCheck", next);
  };

  return (
    <div className="space-y-4">
      <SectionTitle>Stop, look, think — access to the work area</SectionTitle>
      <p className="font-medium text-neutral-900">Is my usual access route still safe?</p>
      <YesNoButtons value={state.safe} disabled={readOnly} onChange={(v) => commit({ safe: v })} />
      {state.safe === false && (
        <div className="space-y-3">
          <StopWorkWarning message="This must be reviewed by a supervisor before the task proceeds." />
          <Field label="Details">
            <textarea
              value={state.details}
              disabled={readOnly}
              onChange={(e) => commit({ details: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </Field>
          <Field label="Control or alternative access route">
            <textarea
              value={state.controlMeasure}
              disabled={readOnly}
              onChange={(e) => commit({ controlMeasure: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </Field>
        </div>
      )}
    </div>
  );
}

// ---------------- Changes ----------------

function ChangesStep({ assessment, save, reload, readOnly }: any) {
  const [hasChanges, setHasChanges] = useState<boolean | null>(
    assessment.changeEntries.length > 0 ? true : null
  );
  const [newEntry, setNewEntry] = useState<{
    category: string;
    details: string;
    controls: string;
    controlled: boolean;
  }>({
    category: CHANGE_CATEGORIES[0],
    details: "",
    controls: "",
    controlled: false,
  });

  const addEntry = async () => {
    await save("changeEntry", newEntry);
    setNewEntry({ category: CHANGE_CATEGORIES[0], details: "", controls: "", controlled: false });
    reload();
  };

  return (
    <div className="space-y-4">
      <SectionTitle>Have I noticed any changes that could affect today's work?</SectionTitle>
      <YesNoButtons
        value={hasChanges}
        disabled={readOnly}
        onChange={(v) => setHasChanges(v)}
      />

      {hasChanges && (
        <div className="space-y-4">
          {assessment.changeEntries.map((entry: any) => (
            <div key={entry.id} className="border border-neutral-200 rounded-lg p-3 bg-white text-sm">
              <p className="font-semibold text-neutral-900">{entry.category}</p>
              <p className="text-neutral-700 mt-1">{entry.details}</p>
              <p className="text-neutral-700 mt-1">
                <span className="font-medium">Controls: </span>
                {entry.controls}
              </p>
              <p className={`mt-1 font-medium ${entry.controlled ? "text-emerald-700" : "text-red-700"}`}>
                {entry.controlled ? "Controlled" : "Not yet controlled"}
              </p>
            </div>
          ))}

          {!readOnly && (
            <div className="border-2 border-dashed border-neutral-300 rounded-lg p-3 space-y-2">
              <p className="font-semibold text-neutral-800 text-sm">Add a change</p>
              <select
                value={newEntry.category}
                onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
              >
                {CHANGE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Details"
                value={newEntry.details}
                onChange={(e) => setNewEntry({ ...newEntry, details: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2"
              />
              <textarea
                placeholder="Control measures"
                value={newEntry.controls}
                onChange={(e) => setNewEntry({ ...newEntry, controls: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2"
              />
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={newEntry.controlled}
                  onChange={(e) => setNewEntry({ ...newEntry, controlled: e.target.checked })}
                  className="w-5 h-5"
                />
                This change has been controlled
              </label>
              <button
                type="button"
                onClick={addEntry}
                disabled={!newEntry.details || !newEntry.controls}
                className="w-full py-2.5 rounded-lg bg-neutral-800 text-white font-medium disabled:opacity-40"
              >
                Add entry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- Hazards ----------------

function HazardsStep({ assessment, save, reload, readOnly }: any) {
  const responseFor = (key: string) =>
    assessment.hazardResponses.find((r: any) => r.questionKey === key);

  return (
    <div className="space-y-6">
      <SectionTitle>Step 2.1 — Identify hazards</SectionTitle>
      <p className="text-sm text-neutral-600 -mt-3">
        Look around your work area and think through every step of the task. "Yes" means the
        hazard is present or could occur. "No" means it isn't relevant to today's work.
      </p>

      {HAZARD_QUESTIONS.map((hq) => {
        const r = responseFor(hq.key);
        return (
          <div key={hq.key} className="border border-neutral-200 rounded-lg p-4 bg-white">
            <p className="font-medium text-neutral-900">{hq.label}</p>
            {hq.examples.length > 0 && (
              <p className="text-xs text-neutral-500 mt-1">e.g. {hq.examples.join(", ")}</p>
            )}
            <div className="mt-3">
              <YesNoButtons
                value={r?.present ?? null}
                disabled={readOnly}
                onChange={async (v) => {
                  await save("hazardResponse", { questionKey: hq.key, present: v });
                  reload();
                }}
              />
            </div>
            {r?.present && (
              <div className="mt-3 space-y-3">
                {(r.cards ?? []).map((card: any) => (
                  <HazardCard
                    key={card.id}
                    card={card}
                    save={save}
                    reload={reload}
                    readOnly={readOnly}
                  />
                ))}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={async () => {
                      await save("hazardCard", { hazardResponseId: r.id });
                      reload();
                    }}
                    className="w-full py-2.5 rounded-lg border-2 border-dashed border-neutral-400 text-neutral-700 font-medium"
                  >
                    + Add hazard detail card
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HazardCard({ card, save, reload, readOnly }: any) {
  const [local, setLocal] = useState({
    description: card.description ?? "",
    initialRisk: card.initialRisk ?? "low",
    controls: card.controls ?? "",
    responsiblePerson: card.responsiblePerson ?? "",
    controlConfirmed: card.controlConfirmed ?? false,
    residualRisk: card.residualRisk ?? "low",
    comments: card.comments ?? "",
  });

  const commit = (patch: Partial<typeof local>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    save("hazardCard", { id: card.id, ...next });
  };

  const highRisk = local.residualRisk === "high" || local.residualRisk === "extreme";

  return (
    <div className="bg-neutral-50 border border-neutral-300 rounded-lg p-3 space-y-3">
      <Field label="Hazard description">
        <textarea
          value={local.description}
          disabled={readOnly}
          onChange={(e) => commit({ description: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
        />
      </Field>
      <Field label="Initial risk rating">
        <RiskSelect value={local.initialRisk} onChange={(v) => commit({ initialRisk: v })} disabled={readOnly} />
      </Field>
      <Field label="Controls to be implemented">
        <textarea
          value={local.controls}
          disabled={readOnly}
          onChange={(e) => commit({ controls: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
        />
      </Field>
      <Field label="Person responsible for the control">
        <input
          type="text"
          value={local.responsiblePerson}
          disabled={readOnly}
          onChange={(e) => commit({ responsiblePerson: e.target.value })}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
        />
      </Field>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={local.controlConfirmed}
          disabled={readOnly}
          onChange={(e) => commit({ controlConfirmed: e.target.checked })}
          className="w-5 h-5"
        />
        Control has been implemented
      </label>
      <Field label="Residual risk rating">
        <RiskSelect value={local.residualRisk} onChange={(v) => commit({ residualRisk: v })} disabled={readOnly} />
      </Field>
      {highRisk && (
        <StopWorkWarning message="High or Extreme residual risk — this task cannot be submitted by the worker alone and requires supervisor intervention." />
      )}
      <Field label="Additional comments (optional)">
        <textarea
          value={local.comments}
          disabled={readOnly}
          onChange={(e) => commit({ comments: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
        />
      </Field>
      {!readOnly && (
        <button
          type="button"
          onClick={async () => {
            await save("deleteHazardCard", { id: card.id });
            reload();
          }}
          className="text-sm text-red-700 font-medium"
        >
          Remove this card
        </button>
      )}
    </div>
  );
}

function RiskSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {RISK_RATINGS.map((r) => (
        <button
          key={r}
          type="button"
          disabled={disabled}
          onClick={() => onChange(r)}
          className={`py-2 rounded-lg text-sm font-semibold capitalize border-2 ${
            value === r
              ? riskColor(r)
              : "bg-white border-neutral-300 text-neutral-700"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

function riskColor(risk: string) {
  switch (risk) {
    case "low":
      return "bg-emerald-700 border-emerald-700 text-white";
    case "medium":
      return "bg-amber-500 border-amber-500 text-white";
    case "high":
      return "bg-orange-600 border-orange-600 text-white";
    case "extreme":
      return "bg-red-700 border-red-700 text-white";
    default:
      return "";
  }
}

// ---------------- New hazard flag ----------------

function NewHazardStep({ assessment, save, readOnly }: any) {
  const [state, setState] = useState({
    present: assessment.newHazardFlag?.present ?? null,
    description: assessment.newHazardFlag?.description ?? "",
    immediateControls: assessment.newHazardFlag?.immediateControls ?? "",
  });

  const commit = (patch: Partial<typeof state>) => {
    const next = { ...state, ...patch };
    setState(next);
    save("newHazardFlag", next);
  };

  return (
    <div className="space-y-4">
      <SectionTitle>
        Was a new hazard identified today that is not currently covered by the selected SWMS?
      </SectionTitle>
      <YesNoButtons value={state.present} disabled={readOnly} onChange={(v) => commit({ present: v })} />
      {state.present && (
        <div className="space-y-3">
          <StopWorkWarning message="This will be flagged for mandatory supervisor review before the assessment can be approved." />
          <Field label="Description">
            <textarea
              value={state.description}
              disabled={readOnly}
              onChange={(e) => commit({ description: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </Field>
          <Field label="Immediate controls">
            <textarea
              value={state.immediateControls}
              disabled={readOnly}
              onChange={(e) => commit({ immediateControls: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </Field>
        </div>
      )}
    </div>
  );
}

// ---------------- Declarations ----------------

function DeclarationsStep({ assessment, save, readOnly }: any) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const d of assessment.declarations) map[d.declarationKey] = d.checked;
    return map;
  });

  return (
    <div className="space-y-4">
      <SectionTitle>Final check</SectionTitle>
      {FINAL_DECLARATIONS.map((d) => (
        <label
          key={d.key}
          className="flex items-start gap-3 border border-neutral-200 rounded-lg p-4 bg-white"
        >
          <input
            type="checkbox"
            checked={!!checked[d.key]}
            disabled={readOnly}
            onChange={(e) => {
              const next = { ...checked, [d.key]: e.target.checked };
              setChecked(next);
              save("declaration", { declarationKey: d.key, checked: e.target.checked });
            }}
            className="w-6 h-6 mt-0.5 flex-shrink-0"
          />
          <span className="text-neutral-900 font-medium">{d.label}</span>
        </label>
      ))}
    </div>
  );
}

// ---------------- Primary sign ----------------

function PrimarySignStep({ assessment, reload, readOnly }: any) {
  const [signing, setSigning] = useState(false);
  const alreadySigned = assessment.signOns.some((s: any) => s.isPrimary);

  const capture = async (dataUrl: string) => {
    setSigning(true);
    try {
      await fetch(`/api/assessments/${assessment.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: assessment.completedByWorkerId,
          signatureData: dataUrl,
          isPrimary: true,
        }),
      });
      reload();
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle>Your signature</SectionTitle>
      <p className="text-neutral-700 text-sm">
        {assessment.completedByWorker?.name}: "I have reviewed and understood this Daily Task
        Safety Awareness assessment, including the identified hazards and controls."
      </p>
      {alreadySigned ? (
        <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-4 text-emerald-800 font-medium">
          Signed {new Date(assessment.signOns.find((s: any) => s.isPrimary).signedAt).toLocaleString("en-AU")}
        </div>
      ) : (
        !readOnly && <SignaturePad onCapture={capture} disabled={signing} />
      )}
    </div>
  );
}

// ---------------- Review ----------------

function ReviewStep({ assessment, submitErrors, onSubmit, submitting, readOnly }: any) {
  const primarySigned = assessment.signOns.some((s: any) => s.isPrimary);

  return (
    <div className="space-y-4">
      <SectionTitle>Review before submitting</SectionTitle>
      <p className="text-sm text-neutral-600">
        Check each section above. When you submit, this assessment moves to supervisor review
        and can no longer be edited by you.
      </p>

      {submitErrors.length > 0 && (
        <div className="rounded-lg border-2 border-red-700 bg-red-50 p-4 space-y-1">
          <p className="font-semibold text-red-800">This can't be submitted yet:</p>
          <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
            {submitErrors.map((e: string, i: number) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {!primarySigned && (
        <p className="text-sm text-amber-700 font-medium">
          Go back to the signature step and sign before submitting.
        </p>
      )}

      {!readOnly && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="w-full py-4 rounded-lg bg-emerald-700 text-white text-lg font-semibold disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit for supervisor review"}
        </button>
      )}

      {assessment.status === "awaiting_supervisor_review" && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-4 text-emerald-800 font-medium">
          Submitted — awaiting supervisor review. You can now invite team members to sign on.
        </div>
      )}

      {assessment.status === "approved" && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-4 space-y-2">
          <p className="text-emerald-800 font-medium">This assessment has been approved.</p>
          <a
            href={`/assess/${assessment.id}/reassess`}
            className="block text-center py-3 rounded-lg border-2 border-amber-600 text-amber-700 font-semibold"
          >
            Conditions have changed — reassess
          </a>
        </div>
      )}
    </div>
  );
}
