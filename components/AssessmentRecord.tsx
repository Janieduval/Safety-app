import { STEP1_QUESTIONS, HAZARD_QUESTIONS, FINAL_DECLARATIONS } from "@/lib/constants";

// The full record of one assessment, used by both the admin and the
// supervisor "View" pages. It only displays things — no buttons that change data.

const STEP1_LABELS: Record<string, string> = Object.fromEntries(
  STEP1_QUESTIONS.map((q) => [q.key, q.label])
);
const HAZARD_LABELS: Record<string, string> = Object.fromEntries(
  HAZARD_QUESTIONS.map((q) => [q.key, q.label])
);
const DECLARATION_LABELS: Record<string, string> = Object.fromEntries(
  FINAL_DECLARATIONS.map((d) => [d.key, d.label])
);

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  worker_completed: "bg-blue-100 text-blue-800",
  awaiting_supervisor_review: "bg-amber-100 text-amber-800",
  changes_required: "bg-orange-100 text-orange-800",
  approved: "bg-emerald-100 text-emerald-800",
  archived: "bg-neutral-200 text-neutral-600",
};

const RISK_BADGE: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  extreme: "bg-red-100 text-red-800",
};

const sydney = (d: Date | string, opts: Intl.DateTimeFormatOptions = {}) =>
  new Date(d).toLocaleString("en-AU", { timeZone: "Australia/Sydney", ...opts });

function Card({
  title,
  count,
  tone = "default",
  children,
}: {
  title: string;
  count?: number;
  tone?: "default" | "amber";
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border shadow-sm p-4 md:p-5 ${
        tone === "amber" ? "bg-amber-50 border-amber-300" : "bg-white border-neutral-200"
      }`}
    >
      <h2 className="font-bold text-neutral-900 mb-3">
        {title}
        {count !== undefined && <span className="ml-1.5 text-neutral-400 font-semibold">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

function YesNo({ value, goodWhen = true }: { value: boolean | null | undefined; goodWhen?: boolean }) {
  if (value === null || value === undefined)
    return (
      <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
        Unanswered
      </span>
    );
  const good = value === goodWhen;
  return (
    <span
      className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
        good ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
      }`}
    >
      {value ? "Yes" : "No"}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700">
      {children}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <div className="text-sm text-neutral-900 mt-0.5">{children}</div>
    </div>
  );
}

function initials(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AssessmentRecord({ a }: { a: any }) {
  // Turn ids in the audit trail back into people's names.
  const actorNameMap: Record<string, string> = {};
  if (a.completedByWorker) actorNameMap[a.completedByWorker.id] = a.completedByWorker.name;
  for (const s of a.signOns ?? []) actorNameMap[s.worker.id] = s.worker.name;
  for (const r of a.supervisorReviews ?? []) {
    if (r.supervisor) actorNameMap[r.supervisor.id] = r.supervisor.name;
  }
  const displayActor = (actorName: string) => {
    if (actorNameMap[actorName]) return actorNameMap[actorName];
    if (actorName === "worker") return "Worker";
    return actorName;
  };

  // Same warning flags as the dashboard.
  const flags: string[] = [];
  if ((a.step1Responses ?? []).some((r: any) => r.answer === false)) flags.push("Stop-work");
  if (a.accessCheck?.safe === false) flags.push("Access");
  if (
    (a.hazardResponses ?? []).some((r: any) =>
      (r.cards ?? []).some((c: any) => c.residualRisk === "high" || c.residualRisk === "extreme")
    )
  )
    flags.push("High/Extreme risk");
  if (a.newHazardFlag?.present) flags.push("New hazard");
  if ((a.permits ?? []).length > 0 && a.permits.some((p: any) => !p.issuedReviewedSigned))
    flags.push("Permit unverified");

  const yesHazards = (a.hazardResponses ?? []).filter((r: any) => r.present === true);
  const otherHazards = (a.hazardResponses ?? []).filter((r: any) => r.present !== true);

  return (
    <div className="space-y-4">
      {/* ---------- Summary ---------- */}
      <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs font-semibold capitalize px-2.5 py-0.5 rounded-full ${
              STATUS_BADGE[a.status] ?? "bg-neutral-100 text-neutral-700"
            }`}
          >
            {a.status.replace(/_/g, " ")}
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
            Version {a.version}
          </span>
          {flags.map((f) => (
            <span
              key={f}
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800"
            >
              {f}
            </span>
          ))}
        </div>

        {a.taskDescription && (
          <p className="mt-3 text-lg font-semibold text-neutral-900 leading-snug">{a.taskDescription}</p>
        )}

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Date">
            {sydney(a.dateTime, { day: "numeric", month: "short", year: "numeric" })}
            <span className="block text-neutral-500">
              {sydney(a.dateTime, { hour: "numeric", minute: "2-digit" })}
            </span>
          </Field>
          <Field label="Completed by">{a.completedByWorker?.name ?? "—"}</Field>
          <Field label="Team">{a.team?.label ?? a.otherTeamText ?? "—"}</Field>
          <Field label="Location">{a.location ?? "—"}</Field>
        </div>

        <p className="mt-4 pt-3 border-t border-neutral-100 text-xs text-neutral-400 break-all">
          {a.project?.name}
          {a.project?.address ? ` · ${a.project.address}` : ""} · Ref {a.id}
        </p>
      </section>

      {/* ---------- Supervisor reviews ---------- */}
      {(a.supervisorReviews ?? []).length > 0 && (
        <Card title="Supervisor reviews" count={a.supervisorReviews.length}>
          <ol className="space-y-3">
            {[...a.supervisorReviews].reverse().map((r: any) => (
              <li key={r.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-neutral-900">
                    Version {r.version} · {r.supervisor?.name ?? "Supervisor"}
                  </p>
                  <span
                    className={`text-[11px] font-semibold capitalize px-2 py-0.5 rounded-full ${
                      r.decision === "approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {r.decision.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">{sydney(r.reviewedAt)}</p>
                {r.comments && (
                  <p className="text-sm text-neutral-700 mt-2">
                    <span className="font-medium">Comments:</span> {r.comments}
                  </p>
                )}
                {r.additionalControls && (
                  <p className="text-sm text-neutral-700 mt-1">
                    <span className="font-medium">Additional controls:</span> {r.additionalControls}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* ---------- Step 1 ---------- */}
      <Card title="Step 1 — plan the task">
        <ul className="divide-y divide-neutral-100">
          {(a.step1Responses ?? []).map((r: any) => (
            <li key={r.id} className="py-2 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm text-neutral-800">
                  {STEP1_LABELS[r.questionKey] ?? r.questionKey}
                </span>
                <YesNo value={r.answer} />
              </div>
              {r.answer === false && r.noDetails && (
                <p className="text-sm text-red-800 mt-1">{r.noDetails}</p>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="SWMS">
          <div className="flex flex-wrap gap-1.5">
            {(a.swms ?? []).length === 0 && !a.swmsOtherText && (
              <span className="text-sm text-neutral-500">None selected</span>
            )}
            {(a.swms ?? []).map((s: any) => (
              <Chip key={s.id}>{s.swmsOption.label}</Chip>
            ))}
            {a.swmsOtherText && <Chip>Other: {a.swmsOtherText}</Chip>}
          </div>
        </Card>

        <Card title="PPE">
          <div className="flex flex-wrap gap-1.5">
            {(a.ppe ?? []).length === 0 && <span className="text-sm text-neutral-500">None selected</span>}
            {(a.ppe ?? []).map((p: any) => (
              <Chip key={p.id}>{p.ppeOption.label}</Chip>
            ))}
          </div>
        </Card>

        <Card title="Permits">
          {a.permitRequired ? (
            <ul className="space-y-2">
              {(a.permits ?? []).map((p: any) => (
                <li key={p.id} className="flex items-start justify-between gap-3">
                  <span className="text-sm text-neutral-800">
                    {p.permitType.label}
                    <span className="block text-xs text-neutral-500">Ref: {p.referenceNumber ?? "—"}</span>
                  </span>
                  <span
                    className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      p.issuedReviewedSigned ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {p.issuedReviewedSigned ? "Confirmed" : "Not confirmed"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">Not required</p>
          )}
        </Card>

        <Card title="Access to work area">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-neutral-800">Safe access</span>
            <YesNo value={a.accessCheck?.safe} />
          </div>
          {a.accessCheck?.details && (
            <p className="text-sm text-neutral-700 mt-2">
              <span className="font-medium">Details:</span> {a.accessCheck.details}
            </p>
          )}
          {a.accessCheck?.controlMeasure && (
            <p className="text-sm text-neutral-700 mt-1">
              <span className="font-medium">Control:</span> {a.accessCheck.controlMeasure}
            </p>
          )}
        </Card>
      </div>

      {(a.changeEntries ?? []).length > 0 && (
        <Card title="Changes on site" count={a.changeEntries.length}>
          <ul className="space-y-2">
            {a.changeEntries.map((c: any) => (
              <li key={c.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-neutral-900">{c.category}</p>
                  <span
                    className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      c.controlled ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {c.controlled ? "Controlled" : "Not controlled"}
                  </span>
                </div>
                <p className="text-sm text-neutral-700 mt-1">{c.details}</p>
                {c.controls && (
                  <p className="text-sm text-neutral-700 mt-1">
                    <span className="font-medium">Controls:</span> {c.controls}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ---------- Hazards ---------- */}
      <Card title="Hazards identified" count={yesHazards.reduce((n: number, r: any) => n + (r.cards?.length ?? 0), 0)}>
        {yesHazards.length === 0 && <p className="text-sm text-neutral-500">No hazards answered “Yes”.</p>}
        <div className="space-y-3">
          {yesHazards.map((r: any) => (
            <div key={r.id}>
              <p className="text-xs font-medium text-neutral-500 mb-1.5">
                {HAZARD_LABELS[r.questionKey] ?? r.questionKey}
              </p>
              <div className="space-y-2">
                {(r.cards ?? []).map((c: any) => (
                  <div key={c.id} className="rounded-xl border border-neutral-200 p-3">
                    <p className="text-sm font-semibold text-neutral-900">{c.description || "—"}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-neutral-500">Initial</span>
                      <span
                        className={`font-semibold capitalize px-2 py-0.5 rounded-full ${
                          RISK_BADGE[c.initialRisk] ?? "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {c.initialRisk ?? "—"}
                      </span>
                      <span className="text-neutral-400">→</span>
                      <span className="text-neutral-500">Residual</span>
                      <span
                        className={`font-semibold capitalize px-2 py-0.5 rounded-full ${
                          RISK_BADGE[c.residualRisk] ?? "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {c.residualRisk ?? "—"}
                      </span>
                    </div>
                    <div className="mt-2 rounded-lg bg-neutral-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                        Controls
                      </p>
                      <p className="text-sm text-neutral-700 whitespace-pre-line">{c.controls || "—"}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-neutral-600">
                        Responsible: <span className="font-medium">{c.responsiblePerson || "—"}</span>
                      </span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-full ${
                          c.controlConfirmed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {c.controlConfirmed ? "Control in place" : "Control not confirmed"}
                      </span>
                    </div>
                    {(c.photos ?? []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {c.photos.map((p: any) => (
                          <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.url}
                              alt={p.kind === "control" ? "Control photo" : "Hazard photo"}
                              className="w-20 h-20 object-cover rounded-lg border border-neutral-200"
                            />
                            <span className="block text-[10px] text-neutral-500 text-center mt-0.5 capitalize">
                              {p.kind}
                            </span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {otherHazards.length > 0 && (
          <details className="mt-4 group">
            <summary className="cursor-pointer text-sm font-semibold text-emerald-700 list-none">
              Other hazard questions ({otherHazards.length}) ▾
            </summary>
            <ul className="mt-2 divide-y divide-neutral-100">
              {otherHazards.map((r: any) => (
                <li key={r.id} className="py-1.5 flex items-start justify-between gap-3">
                  <span className="text-sm text-neutral-700">{HAZARD_LABELS[r.questionKey] ?? r.questionKey}</span>
                  <YesNo value={r.present} goodWhen={false} />
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      {a.newHazardFlag?.present && (
        <Card title="New hazard not covered by SWMS" tone="amber">
          <p className="text-sm text-neutral-900">{a.newHazardFlag.description}</p>
          <p className="text-sm text-neutral-700 mt-1">
            <span className="font-medium">Immediate controls:</span> {a.newHazardFlag.immediateControls}
          </p>
          <p
            className={`mt-2 inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              a.newHazardFlag.resolved ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
            }`}
          >
            {a.newHazardFlag.resolved ? "Resolved" : "Unresolved — requires action"}
          </p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Final check">
          <ul className="space-y-2">
            {(a.declarations ?? []).map((d: any) => (
              <li key={d.id} className="flex items-start gap-2">
                <span
                  className={`mt-0.5 w-4 h-4 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                    d.checked ? "bg-emerald-600" : "bg-red-500"
                  }`}
                >
                  {d.checked ? "✓" : "✕"}
                </span>
                <span className="text-sm text-neutral-800">
                  {DECLARATION_LABELS[d.declarationKey] ?? d.declarationKey}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Team sign-ons" count={(a.signOns ?? []).length}>
          {(a.signOns ?? []).length === 0 && <p className="text-sm text-neutral-500">No one has signed yet.</p>}
          <ul className="space-y-2">
            {(a.signOns ?? []).map((s: any) => (
              <li key={s.id} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {initials(s.worker.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-neutral-900 truncate">
                    {s.worker.name}
                    {s.isPrimary && (
                      <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Primary
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-neutral-500">
                    v{s.version} · {sydney(s.signedAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {(a.auditLogs ?? []).length > 0 && (
        <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 md:p-5">
          <details>
            <summary className="cursor-pointer font-bold text-neutral-900 list-none flex items-center justify-between">
              <span>
                Audit trail <span className="ml-1 text-neutral-400 font-semibold">{a.auditLogs.length}</span>
              </span>
              <span className="text-xs font-semibold text-emerald-700">Show ▾</span>
            </summary>
            <ul className="mt-3 space-y-1.5">
              {a.auditLogs.map((log: any) => (
                <li key={log.id} className="text-xs text-neutral-600">
                  <span className="text-neutral-400">{sydney(log.timestamp)}</span> — {log.action} by{" "}
                  {displayActor(log.actorName)}
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}
