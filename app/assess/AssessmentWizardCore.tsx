"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAssessmentData, useAutosave } from "@/lib/useAssessment";
import AutosaveStatus from "@/components/AutosaveStatus";
import YesNoButtons from "@/components/YesNoButtons";
import StopWorkWarning from "@/components/StopWorkWarning";
import SignaturePad from "@/components/SignaturePad";
import RiskLegend from "@/components/RiskLegend";
import { toSydneyInputValue, fromSydneyInputValue } from "@/lib/timezone";
import { isLocalId, getLocalAssessment, saveLocalAssessment } from "@/lib/offlineStore";
import { signLocalAssessment, validateLocalAssessmentForSubmit } from "@/lib/offlineAssessment";
import {
  STEP1_QUESTIONS,
  STOP_WORK_WARNING,
  HAZARD_QUESTIONS,
  FINAL_DECLARATIONS,
  CHANGE_CATEGORIES,
  RISK_RATINGS,
  SIGNON_CONFIRMATION_TEXT,
} from "@/lib/constants";

const STEPS = [
  "header",
  "step1",
  "swms",
  "ppe",
  "permits",
  "access",
  "changes",
  "hazardPause",
  "hazards",
  "newHazard",
  "declarations",
  "finish",
] as const;

const HAZARD_PAUSE_SECONDS = 20;

const CRITICAL_STEPS = [
  "step1",
  "swms",
  "access",
  "hazardPause",
  "hazards",
  "newHazard",
  "declarations",
];

function computeSignValid(assessment: any): boolean {
  return !!assessment?.signOns?.some((s: any) => s.isPrimary);
}

export function AssessmentWizardCore({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceViewOnly = searchParams.get("view") === "1";
  const { assessment, project, teams, loading, error, reload, reloadAssessment } = useAssessmentData(id);
  const { save, status } = useAutosave(id);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [localValidity, setLocalValidity] = useState<Record<string, boolean>>({});

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

  const readOnly = forceViewOnly || (assessment.status !== "draft" && assessment.status !== "changes_required");
  const step = STEPS[stepIndex];

  const isCriticalStep = CRITICAL_STEPS.includes(step);
  let criticalStepValid = true;
  if (!readOnly && isCriticalStep) {
    criticalStepValid = localValidity[step] === true;
  }
  const continueBlocked = !readOnly && isCriticalStep && !criticalStepValid;

  const setStepValidity = (key: string) => (valid: boolean) => {
    setLocalValidity((prev) => (prev[key] === valid ? prev : { ...prev, [key]: valid }));
  };

  const goNext = () => {
    if (continueBlocked) return;
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitErrors([]);
    try {
      if (isLocalId(id)) {
        const { ok, errors } = validateLocalAssessmentForSubmit(assessment);
        if (!ok) {
          setSubmitErrors(errors);
          return;
        }
        const local = await getLocalAssessment(id);
        if (local) {
          await saveLocalAssessment({
            ...local,
            syncStatus: "pending_submit",
            data: { ...local.data, status: "awaiting_supervisor_review" },
          });
        }
        await reload();
        return;
      }
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

  const latestSupervisorReview =
    assessment.supervisorReviews && assessment.supervisorReviews.length > 0
      ? assessment.supervisorReviews[assessment.supervisorReviews.length - 1]
      : null;

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
        {readOnly && forceViewOnly && (
          <div className="mb-4 rounded-lg bg-blue-50 border border-blue-300 p-3 text-blue-800 text-sm font-medium">
            You're viewing this assessment. Only the person who completed it can change its
            contents — you can still add your signature on the Team sign-on step.
          </div>
        )}

        {readOnly && !forceViewOnly && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-300 p-3 text-amber-800 text-sm font-medium">
            This assessment is {assessment.status.replace(/_/g, " ")} and can no longer be
            edited here.
          </div>
        )}

        {assessment.status === "changes_required" && latestSupervisorReview && (
          <div className="mb-4 rounded-lg bg-amber-50 border-2 border-amber-400 p-4 text-amber-900 text-sm">
            <p className="font-semibold mb-1">
              Changes requested by {latestSupervisorReview.supervisor?.name ?? "your supervisor"}
              {assessment.version ? ` (Version ${assessment.version})` : ""}:
            </p>
            {latestSupervisorReview.comments && <p>{latestSupervisorReview.comments}</p>}
            {latestSupervisorReview.additionalControls && (
              <p className="mt-1">
                Additional controls requested: {latestSupervisorReview.additionalControls}
              </p>
            )}
            {!latestSupervisorReview.comments && !latestSupervisorReview.additionalControls && (
              <p>No additional comments were left. Review each step for accuracy before resubmitting.</p>
            )}
          </div>
        )}

        {step === "header" && (
          <HeaderStep assessment={assessment} teams={teams} save={save} readOnly={readOnly} />
        )}
        {step === "step1" && (
          <Step1
            assessment={assessment}
            save={save}
            readOnly={readOnly}
            onValidityChange={setStepValidity("step1")}
          />
        )}
        {step === "swms" && (
          <SwmsStep
            assessment={assessment}
            project={project}
            save={save}
            readOnly={readOnly}
            onValidityChange={setStepValidity("swms")}
          />
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
          <AccessStep
            assessment={assessment}
            save={save}
            readOnly={readOnly}
            onValidityChange={setStepValidity("access")}
          />
        )}
        {step === "changes" && (
          <ChangesStep assessment={assessment} save={save} reload={reloadAssessment} readOnly={readOnly} />
        )}
        {step === "hazardPause" && (
          <HazardPauseStep
            key={readOnly ? "readonly" : stepIndex}
            readOnly={readOnly}
            onValidityChange={setStepValidity("hazardPause")}
          />
        )}
        {step === "hazards" && (
          <HazardsStep
            assessment={assessment}
            teams={teams}
            save={save}
            reload={reloadAssessment}
            readOnly={readOnly}
            onValidityChange={setStepValidity("hazards")}
          />
        )}
        {step === "newHazard" && (
          <NewHazardStep
            assessment={assessment}
            save={save}
            readOnly={readOnly}
            onValidityChange={setStepValidity("newHazard")}
          />
        )}
        {step === "declarations" && (
          <DeclarationsStep
            assessment={assessment}
            save={save}
            readOnly={readOnly}
            onValidityChange={setStepValidity("declarations")}
          />
        )}
        {step === "finish" && (
          <div className="space-y-8">
            <PrimarySignStep assessment={assessment} reload={reloadAssessment} readOnly={readOnly} />

            <div className="border-t border-neutral-200 pt-6">
              <TeamSignStep
                assessment={assessment}
                project={project}
                reload={reloadAssessment}
                readOnly={forceViewOnly ? false : readOnly}
              />
            </div>

            <div className="border-t border-neutral-200 pt-6">
              {assessment.status === "changes_required" && !forceViewOnly && (
                <ChangesAcknowledgmentStep assessment={assessment} reload={reloadAssessment} />
              )}
              {assessment.status === "changes_required" && forceViewOnly && (
                <div className="space-y-4">
                  <SectionTitle>Changes required</SectionTitle>
                  <p className="text-sm text-neutral-600">
                    This assessment can only be resubmitted by the person who completed it.
                  </p>
                </div>
              )}
              {assessment.status !== "changes_required" && (
                <ReviewStep
                  assessment={assessment}
                  submitErrors={submitErrors}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                  readOnly={readOnly}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-4 py-3">
        <div className="max-w-md mx-auto">
          {continueBlocked && (
            <p className="text-xs text-amber-700 font-medium mb-2 text-center">
              {step === "hazardPause"
                ? "Take a moment to look around before continuing."
                : "Complete this step before continuing."}
            </p>
          )}
          <div className="flex gap-3">
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
              disabled={stepIndex === STEPS.length - 1 || continueBlocked}
              className="flex-1 py-3 rounded-lg bg-emerald-700 text-white font-semibold disabled:opacity-40"
            >
              Continue
            </button>
          </div>
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

// ---------------- Hazard pause ----------------

function HazardPauseStep({ readOnly, onValidityChange }: any) {
  const [secondsLeft, setSecondsLeft] = useState(readOnly ? 0 : HAZARD_PAUSE_SECONDS);

  useEffect(() => {
    if (!onValidityChange) return;
    if (secondsLeft <= 0) {
      onValidityChange(true);
      return;
    }
    onValidityChange(false);
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <p className="text-xl font-semibold text-neutral-900 mb-4">
        Now, look around you.
      </p>
      <p className="text-neutral-700 text-base mb-10 max-w-xs">
        Take in your work area. What could hurt you? What hazards do you see?
      </p>
      {secondsLeft > 0 ? (
        <div className="text-6xl font-bold text-emerald-700 tabular-nums">{secondsLeft}</div>
      ) : (
        <div className="text-emerald-700 font-semibold">You can continue now.</div>
      )}
    </div>
  );
}

// ---------------- Header ----------------

function HeaderStep({ assessment, teams, save, readOnly }: any) {
  const [local, setLocal] = useState({
    dateTime: assessment.dateTime ? toSydneyInputValue(assessment.dateTime) : "",
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
    save("header", {
      ...next,
      dateTime: next.dateTime ? fromSydneyInputValue(next.dateTime).toISOString() : next.dateTime,
    });
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

function Step1({ assessment, save, readOnly, onValidityChange }: any) {
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

  useEffect(() => {
    if (!onValidityChange) return;
    const valid = STEP1_QUESTIONS.every((q) => {
      const r = responses[q.key];
      if (!r || r.answer === null || r.answer === undefined) return false;
      if (r.answer === false) {
        return !!r.noDetails?.trim() && r.spokenToSupervisor === true;
      }
      return true;
    });
    onValidityChange(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responses]);

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

function SwmsStep({ assessment, project, save, readOnly, onValidityChange }: any) {
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

  useEffect(() => {
    if (!onValidityChange) return;
    const valid = selected.length > 0 && (!isOtherSelected || !!otherText.trim());
    onValidityChange(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, otherText, isOtherSelected]);

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
  const [selected, setSelected] = useState<string[]>(() =>
    assessment.ppe.map((p: any) => p.ppeOptionId)
  );
  const [otherText, setOtherText] = useState(assessment.ppeOtherText ?? "");

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
        Select the PPE required for today's task.
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

function AccessStep({ assessment, save, readOnly, onValidityChange }: any) {
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

  useEffect(() => {
    if (!onValidityChange) return;
    let valid = false;
    if (state.safe === true) valid = true;
    else if (state.safe === false) {
      valid = !!state.details?.trim() && !!state.controlMeasure?.trim();
    }
    onValidityChange(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

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

function HazardsStep({ assessment, teams, save, reload, readOnly, onValidityChange }: any) {
  // Local state so the Yes/No buttons update the instant you tap them,
  // the same way Step 1 already works — instead of waiting for a full
  // save-then-reload round trip before the button even changes color.
  // Saving still happens in the background exactly as before; this just
  // stops the UI from blocking on it.
  const [responses, setResponses] = useState<Record<string, any>>(() => {
    const map: Record<string, any> = {};
    for (const r of assessment.hazardResponses) map[r.questionKey] = r;
    return map;
  });

  // Stay in sync with the parent's copy too — this matters after adding
  // or removing a hazard card, which still needs a real reload to pick up
  // the server-generated card ID.
  useEffect(() => {
    const map: Record<string, any> = {};
    for (const r of assessment.hazardResponses) map[r.questionKey] = r;
    setResponses(map);
  }, [assessment.hazardResponses]);

  // Report validity from THIS component's own local state — the same
  // reliably up-to-date source the visible cards are drawn from — rather
  // than a separate copy elsewhere that can fall out of sync. This is
  // what actually decides whether "Continue" is enabled.
  useEffect(() => {
    if (!onValidityChange) return;
    let valid = true;
    for (const hq of HAZARD_QUESTIONS) {
      const r = responses[hq.key];
      if (!r || r.present === null || r.present === undefined) {
        valid = false;
        break;
      }
      if (r.present) {
        const cards = r.cards ?? [];
        if (cards.length === 0) {
          valid = false;
          break;
        }
        for (const c of cards) {
          if (!c.description?.trim() || !c.controls?.trim() || !c.responsiblePerson?.trim()) {
            valid = false;
            break;
          }
        }
        if (!valid) break;
      }
    }
    onValidityChange(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responses]);

  const setPresent = (key: string, present: boolean) => {
    setResponses((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { questionKey: key, cards: [] }), present },
    }));
    save("hazardResponse", { questionKey: key, present });
    reload();
  };

  return (
    <div className="space-y-6">
      <SectionTitle>Step 2.1 — Identify hazards</SectionTitle>
      <p className="text-sm text-neutral-600 -mt-3">
        Look around your work area and think through every step of the task. "Yes" means the
        hazard is present or could occur. "No" means it isn't relevant to today's work.
      </p>

      {HAZARD_QUESTIONS.map((hq) => {
        const r = responses[hq.key];
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
                onChange={(v) => setPresent(hq.key, v)}
              />
            </div>
            {r?.present && (
              <div className="mt-3 space-y-3">
                {(r.cards ?? []).map((card: any) => (
                  <HazardCard
                    key={card.id}
                    card={card}
                    save={save}
                    readOnly={readOnly}
                    questionKey={hq.key}
                    teamId={assessment.teamId}
                    teams={teams}
                    workerId={assessment.completedByWorkerId}
                    assessmentId={assessment.id}
                    onUpdate={(patch: any) => {
                      setResponses((prev) => ({
                        ...prev,
                        [hq.key]: {
                          ...prev[hq.key],
                          cards: (prev[hq.key]?.cards ?? []).map((c: any) =>
                            c.id === card.id ? { ...c, ...patch } : c
                          ),
                        },
                      }));
                    }}
                    onRemoved={() => {
                      setResponses((prev) => ({
                        ...prev,
                        [hq.key]: {
                          ...prev[hq.key],
                          cards: (prev[hq.key]?.cards ?? []).filter(
                            (c: any) => c.id !== card.id
                          ),
                        },
                      }));
                      // Keep the parent's copy in sync in the background —
                      // it's what the Continue button's validity check
                      // reads from, so this must never be skipped.
                      reload();
                    }}
                  />
                ))}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={async () => {
                      const { result } = await save("hazardCard", { hazardResponseId: r.id });
                      if (result) {
                        setResponses((prev) => ({
                          ...prev,
                          [hq.key]: {
                            ...prev[hq.key],
                            cards: [...(prev[hq.key]?.cards ?? []), result],
                          },
                        }));
                      }
                      // Always sync the parent in the background, whether
                      // or not the fast path above ran — the Continue
                      // button's validity check reads from the parent's
                      // copy, not from this component's local state, so
                      // skipping this is what caused Continue to get
                      // stuck even when everything was actually filled in.
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

function HazardCard({
  card,
  save,
  onRemoved,
  onUpdate,
  readOnly,
  questionKey,
  teamId,
  teams,
  workerId,
  assessmentId,
}: any) {
  const [local, setLocal] = useState({
    description: card.description ?? "",
    initialRisk: card.initialRisk ?? "low",
    controls: card.controls ?? "",
    responsiblePerson: card.responsiblePerson ?? "",
    controlConfirmed: card.controlConfirmed ?? false,
    residualRisk: card.residualRisk ?? "low",
    comments: card.comments ?? "",
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const commit = (patch: Partial<typeof local>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    save("hazardCard", { id: card.id, ...next });
    // Tell HazardsStep right away too — it's what decides whether
    // Continue is enabled, and needs to see every keystroke, not just
    // cards being added or removed.
    onUpdate?.(next);
  };

  const team = teams?.find((t: any) => t.id === teamId);
  const teamTemplates = (team?.hazardTemplates ?? []).filter(
    (t: any) => t.questionKey === questionKey
  );
  const matchingSuggestions = local.description.trim()
    ? teamTemplates.filter((t: any) =>
        t.description.toLowerCase().includes(local.description.trim().toLowerCase())
      )
    : teamTemplates;

  const applySuggestion = (template: any) => {
    commit({
      description: template.description,
      controls: template.controls,
      initialRisk: template.initialRisk,
      residualRisk: template.residualRisk,
      // Never carried over — must be confirmed fresh every time.
      responsiblePerson: local.responsiblePerson,
      controlConfirmed: false,
    });
    setShowSuggestions(false);
  };

  const canOfferSave =
    !readOnly &&
    !!teamId &&
    !!local.description.trim() &&
    !!local.controls.trim() &&
    !isLocalId(assessmentId); // saving a new template needs a connection

  const saveForNextTime = async () => {
    setSaveState("saving");
    try {
      const res = await fetch("/api/hazard-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          questionKey,
          description: local.description,
          controls: local.controls,
          initialRisk: local.initialRisk,
          residualRisk: local.residualRisk,
          createdByWorkerId: workerId,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const highRisk = local.residualRisk === "high" || local.residualRisk === "extreme";

  return (
    <div className="bg-neutral-50 border border-neutral-300 rounded-lg p-3 space-y-3">
      <Field label="Hazard description">
        <div className="relative">
          <textarea
            value={local.description}
            disabled={readOnly}
            onChange={(e) => commit({ description: e.target.value })}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            rows={2}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white"
          />
          {showSuggestions && matchingSuggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full border border-neutral-200 rounded-lg divide-y bg-white max-h-56 overflow-y-auto shadow-lg">
              {matchingSuggestions.map((t: any) => (
                <button
                  key={t.id}
                  type="button"
                  onMouseDown={() => applySuggestion(t)}
                  className="w-full text-left px-3 py-2 active:bg-neutral-100"
                >
                  <p className="text-sm font-medium text-neutral-900">{t.description}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">Controls: {t.controls}</p>
                  {t.needsReview && (
                    <span className="text-xs text-amber-700 font-semibold">Pending review</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </Field>
      <RiskLegend />
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
      {canOfferSave && saveState === "idle" && (
        <button
          type="button"
          onClick={saveForNextTime}
          className="text-sm text-emerald-700 font-medium underline decoration-dotted"
        >
          + Save this as a reusable answer{team?.label ? ` for ${team.label}` : ""}
        </button>
      )}
      {saveState === "saving" && (
        <p className="text-sm text-neutral-500">Saving...</p>
      )}
      {saveState === "saved" && (
        <p className="text-sm text-emerald-700 font-medium">
          ✓ Saved — visible to your team now, pending admin review
        </p>
      )}
      {saveState === "error" && (
        <p className="text-sm text-red-700 font-medium">
          Couldn't save this right now. Check your connection and try again.
        </p>
      )}
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
          onClick={() => {
            onRemoved();
            save("deleteHazardCard", { id: card.id });
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

function NewHazardStep({ assessment, save, readOnly, onValidityChange }: any) {
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

  useEffect(() => {
    if (!onValidityChange) return;
    let valid = false;
    if (state.present === false) valid = true;
    else if (state.present === true) {
      valid = !!state.description?.trim() && !!state.immediateControls?.trim();
    }
    onValidityChange(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

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

function DeclarationsStep({ assessment, save, readOnly, onValidityChange }: any) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const d of assessment.declarations) map[d.declarationKey] = d.checked;
    return map;
  });

  useEffect(() => {
    if (!onValidityChange) return;
    const valid = FINAL_DECLARATIONS.every((d) => checked[d.key] === true);
    onValidityChange(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked]);

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
  const [error, setError] = useState<string | null>(null);
  const alreadySigned = assessment.signOns.some((s: any) => s.isPrimary);

  const capture = async (dataUrl: string) => {
    setSigning(true);
    setError(null);
    try {
      if (isLocalId(assessment.id)) {
        await signLocalAssessment(assessment.id, {
          workerId: assessment.completedByWorkerId,
          workerName: assessment.completedByWorker?.name ?? "Worker",
          signatureData: dataUrl,
          isPrimary: true,
        });
      } else {
        const res = await fetch(`/api/assessments/${assessment.id}/sign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workerId: assessment.completedByWorkerId,
            signatureData: dataUrl,
            isPrimary: true,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Couldn't save the signature (error ${res.status}). Try again.`);
        }
      }
      await reload();
    } catch (e: any) {
      setError(e.message ?? "Couldn't save the signature. Check your connection and try again.");
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
        !readOnly && (
          <>
            <SignaturePad onCapture={capture} disabled={signing} />
            {error && <p className="text-red-700 text-sm font-medium">{error}</p>}
          </>
        )
      )}
    </div>
  );
}

// ---------------- Team sign-on (in-flow, before submission) ----------------

function TeamSignStep({ assessment, project, reload, readOnly }: any) {
  const [query, setQuery] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  const alreadySignedIds = useMemo(
    () => new Set(assessment.signOns.map((s: any) => s.workerId)),
    [assessment]
  );

  const availableWorkers = useMemo(() => {
    const list = project.workers.filter((w: any) => !alreadySignedIds.has(w.id));
    if (!query.trim()) return list;
    return list.filter((w: any) => w.name.toLowerCase().includes(query.toLowerCase()));
  }, [project, query, alreadySignedIds]);

  const exactMatchExists = useMemo(
    () => availableWorkers.some((w: any) => w.name.toLowerCase() === query.trim().toLowerCase()),
    [availableWorkers, query]
  );

  const addNewWorker = async () => {
    const trimmedName = query.trim();
    if (!trimmedName) return;
    setAddingNew(true);
    setSignError(null);
    try {
      const res = await fetch("/api/workers/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, name: trimmedName }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not add you as a new worker.");
      }
      const { worker } = await res.json();
      await reload();
      setSelectedWorkerId(worker.id);
      setQuery(worker.name);
    } catch (e: any) {
      setSignError(e.message);
    } finally {
      setAddingNew(false);
    }
  };

  const capture = async (dataUrl: string) => {
    if (!selectedWorkerId) return;
    setSaving(true);
    setSignError(null);
    try {
      if (isLocalId(assessment.id)) {
        const workerName =
          project.workers.find((w: any) => w.id === selectedWorkerId)?.name ?? query;
        await signLocalAssessment(assessment.id, {
          workerId: selectedWorkerId,
          workerName,
          signatureData: dataUrl,
        });
      } else {
        const res = await fetch(`/api/assessments/${assessment.id}/sign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workerId: selectedWorkerId, signatureData: dataUrl }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Could not sign.");
        }
      }
      setSelectedWorkerId(null);
      setQuery("");
      setConfirmed(false);
      await reload();
    } catch (e: any) {
      setSignError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const otherSignOns = assessment.signOns.filter((s: any) => !s.isPrimary);

  return (
    <div className="space-y-4">
      <SectionTitle>Team sign-on</SectionTitle>
      <p className="text-sm text-neutral-600 -mt-3">
        Anyone else on the crew who needs to sign onto this assessment can do that now, before
        it's submitted for supervisor review. There's no fixed number — add as many as needed,
        or skip this if it's just you.
      </p>

      <p className="text-sm font-medium text-neutral-700">
        {assessment.signOns.length} signed on so far
      </p>

      <a href={`/api/assessments/${assessment.id}/pdf`} target="_blank" rel="noreferrer" className="inline-block text-sm text-emerald-700 font-medium underline decoration-dotted">
        Download a PDF record of this assessment so far
      </a>

      {otherSignOns.length > 0 && (
        <div className="space-y-2">
          {otherSignOns.map((s: any) => (
            <div
              key={s.id}
              className="flex items-center justify-between border border-neutral-200 rounded-lg p-3 bg-white"
            >
              <span className="font-medium text-neutral-800">{s.worker.name}</span>
              <span className="text-xs text-neutral-500">
                {new Date(s.signedAt).toLocaleTimeString("en-AU")}
              </span>
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className="border-t border-neutral-200 pt-4">
          <input
            type="text"
            placeholder="Search a team member's name..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedWorkerId(null);
            }}
            className="w-full rounded-lg border border-neutral-300 px-4 py-3"
          />
          {query && !selectedWorkerId && (
            <div className="mt-1 border border-neutral-200 rounded-lg divide-y bg-white max-h-48 overflow-y-auto">
              {availableWorkers.map((w: any) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setSelectedWorkerId(w.id);
                    setQuery(w.name);
                  }}
                  className="w-full text-left px-4 py-3 active:bg-neutral-100"
                >
                  {w.name}
                </button>
              ))}
              {availableWorkers.length === 0 && (
                <p className="p-3 text-sm text-neutral-500">No matching worker found.</p>
              )}
              {!exactMatchExists && query.trim().length > 1 && (
                <button
                  type="button"
                  onClick={addNewWorker}
                  disabled={addingNew}
                  className="w-full text-left px-4 py-3 text-emerald-700 font-medium active:bg-emerald-50 disabled:opacity-50"
                >
                  {addingNew ? "Adding..." : `+ Add "${query.trim()}" as a new worker`}
                </button>
              )}
            </div>
          )}

          {selectedWorkerId && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-neutral-700">{SIGNON_CONFIRMATION_TEXT}</p>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="w-5 h-5"
                />
                I confirm I have reviewed and understood this assessment
              </label>
              {confirmed && <SignaturePad onCapture={capture} disabled={saving} />}
              {signError && <p className="text-red-700 text-sm font-medium">{signError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- Changes acknowledgment (resubmit after changes required) ----------------

function ChangesAcknowledgmentStep({ assessment, reload }: any) {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestSupervisorReview =
    assessment.supervisorReviews && assessment.supervisorReviews.length > 0
      ? assessment.supervisorReviews[assessment.supervisorReviews.length - 1]
      : null;

  const capture = async (dataUrl: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/assessments/${assessment.id}/resubmit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: assessment.completedByWorkerId,
          signatureData: dataUrl,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error ?? (body.errors ? body.errors.join(", ") : "Could not resubmit.")
        );
      }
      await reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle>Changes required</SectionTitle>
      {latestSupervisorReview && (
        <div className="rounded-lg bg-amber-50 border border-amber-300 p-4 text-amber-900 text-sm">
          <p className="font-semibold mb-1">
            Requested by {latestSupervisorReview.supervisor?.name ?? "your supervisor"}:
          </p>
          {latestSupervisorReview.comments && <p>{latestSupervisorReview.comments}</p>}
          {latestSupervisorReview.additionalControls && (
            <p className="mt-1">
              Additional controls: {latestSupervisorReview.additionalControls}
            </p>
          )}
        </div>
      )}
      <label className="flex items-start gap-3 border border-neutral-200 rounded-lg p-4 bg-white">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="w-6 h-6 mt-0.5 flex-shrink-0"
        />
        <span className="text-neutral-900 font-medium text-sm">
          I am aware of the changes required above and have addressed them in this assessment.
        </span>
      </label>
      {confirmed && (
        <div className="space-y-3">
          <p className="text-sm text-neutral-700">
            Sign below to resubmit this assessment as Version {assessment.version + 1}.
          </p>
          <SignaturePad onCapture={capture} disabled={submitting} />
          {error && <p className="text-red-700 text-sm font-medium">{error}</p>}
        </div>
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
          disabled={submitting || !primarySigned}
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
          <a href={`/assess/${assessment.id}/reassess`} className="block text-center py-3 rounded-lg border-2 border-amber-600 text-amber-700 font-semibold">
            Conditions have changed — reassess
          </a>
        </div>
      )}
    </div>
  );
}
