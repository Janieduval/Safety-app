import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { STEP1_QUESTIONS, HAZARD_QUESTIONS, FINAL_DECLARATIONS } from "@/lib/constants";

const STEP1_LABELS: Record<string, string> = Object.fromEntries(
  STEP1_QUESTIONS.map((q) => [q.key, q.label])
);
const HAZARD_LABELS: Record<string, string> = Object.fromEntries(
  HAZARD_QUESTIONS.map((q) => [q.key, q.label])
);
const DECLARATION_LABELS: Record<string, string> = Object.fromEntries(
  FINAL_DECLARATIONS.map((d) => [d.key, d.label])
);

export default async function AssessmentRecordPage({ params }: { params: { id: string } }) {
  const a = await prisma.assessment.findUnique({
    where: { id: params.id },
    include: {
      project: true,
      team: true,
      completedByWorker: true,
      step1Responses: true,
      swms: { include: { swmsOption: true } },
      ppe: { include: { ppeOption: true } },
      permits: { include: { permitType: true } },
      accessCheck: true,
      changeEntries: true,
      hazardResponses: { include: { cards: true } },
      declarations: true,
      newHazardFlag: true,
      signOns: { include: { worker: true }, orderBy: { signedAt: "asc" } },
      supervisorReviews: { include: { supervisor: true }, orderBy: { version: "asc" } },
      reassessments: true,
      auditLogs: { orderBy: { timestamp: "asc" } },
    },
  });

  if (!a) notFound();

  const latestReview = a.supervisorReviews[a.supervisorReviews.length - 1] ?? null;

  const actorNameMap: Record<string, string> = {};
  if (a.completedByWorker) actorNameMap[a.completedByWorker.id] = a.completedByWorker.name;
  for (const s of a.signOns) actorNameMap[s.worker.id] = s.worker.name;
  for (const r of a.supervisorReviews) {
    if (r.supervisor) actorNameMap[r.supervisor.id] = r.supervisor.name;
  }
  const displayActor = (actorName: string) => {
    if (actorNameMap[actorName]) return actorNameMap[actorName];
    if (actorName === "worker") return "Worker";
    return actorName;
  };

  return (
    <main className="min-h-dvh bg-neutral-50 px-4 py-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-500">
            Reference {a.id} · Status:{" "}
            <span className="font-semibold capitalize">{a.status.replace(/_/g, " ")}</span>
            {" "}· Version {a.version}
          </p>
          <h1 className="text-2xl font-bold text-neutral-900 mt-1">{a.project.name}</h1>
          <p className="text-neutral-600">{a.project.address}</p>
          <p className="text-neutral-600 text-sm">
            {new Date(a.dateTime).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })} · Team:{" "}
            {a.team?.label ?? a.otherTeamText ?? "—"} · Location: {a.location ?? "—"}
          </p>
          <p className="text-neutral-800 mt-2">{a.taskDescription}</p>
          <p className="text-neutral-600 text-sm mt-1">
            Completed by {a.completedByWorker?.name}
          </p>
        </div>
        
          <a
            href={`/api/assessments/${a.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-sm px-4 py-2 rounded-lg bg-neutral-900 text-white font-medium"
        >
          Download PDF
        </a>
      </div>

      <Section title="Step 1 responses">
        <ul className="space-y-1 text-sm">
          {a.step1Responses.map((r) => (
            <li key={r.id}>
              <span className="font-medium">{STEP1_LABELS[r.questionKey] ?? r.questionKey}:</span>{" "}
              {r.answer === null ? "Unanswered" : r.answer ? "Yes" : "No"}
              {r.answer === false && r.noDetails ? ` — ${r.noDetails}` : ""}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="SWMS">
        <p className="text-sm">
          {a.swms.map((s) => s.swmsOption.label).join(", ") || "None selected"}
          {a.swmsOtherText ? ` (Other: ${a.swmsOtherText})` : ""}
        </p>
      </Section>

      <Section title="PPE">
        <p className="text-sm">
          {a.ppe.map((p) => p.ppeOption.label).join(", ") || "None selected"}
        </p>
      </Section>

      <Section title="Permits">
        {a.permitRequired ? (
          <ul className="text-sm space-y-1">
            {a.permits.map((p) => (
              <li key={p.id}>
                {p.permitType.label} — Ref: {p.referenceNumber ?? "—"} —{" "}
                {p.issuedReviewedSigned ? "Confirmed" : "Not confirmed"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-600">Not required</p>
        )}
      </Section>

      <Section title="Access check">
        <p className="text-sm">
          Safe: {a.accessCheck?.safe === null ? "Unanswered" : a.accessCheck?.safe ? "Yes" : "No"}
        </p>
        {a.accessCheck?.details && <p className="text-sm">Details: {a.accessCheck.details}</p>}
        {a.accessCheck?.controlMeasure && (
          <p className="text-sm">Control: {a.accessCheck.controlMeasure}</p>
        )}
      </Section>

      {a.changeEntries.length > 0 && (
        <Section title="Changes noted">
          <ul className="space-y-2 text-sm">
            {a.changeEntries.map((c) => (
              <li key={c.id} className="border border-neutral-200 rounded-lg p-2">
                <p className="font-medium">{c.category}</p>
                <p>{c.details}</p>
                <p>Controls: {c.controls}</p>
                <p>{c.controlled ? "Controlled" : "Not controlled"}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Hazards">
        <div className="space-y-3">
          {a.hazardResponses.map((r) => (
            <div key={r.id} className="text-sm">
              <p className="font-medium">
                {HAZARD_LABELS[r.questionKey] ?? r.questionKey}:{" "}
                {r.present === null ? "Unanswered" : r.present ? "Yes" : "No"}
              </p>
              {r.cards.map((c) => (
                <div key={c.id} className="ml-4 border-l-2 border-neutral-200 pl-3 mt-1">
                  <p>{c.description}</p>
                  <p>
                    Initial: {c.initialRisk} → Residual: {c.residualRisk}
                  </p>
                  <p>Controls: {c.controls}</p>
                  <p>Responsible: {c.responsiblePerson}</p>
                  <p>{c.controlConfirmed ? "Control confirmed" : "Control not confirmed"}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Section>

      {a.newHazardFlag?.present && (
        <Section title="New hazard not covered by SWMS">
          <p className="text-sm">{a.newHazardFlag.description}</p>
          <p className="text-sm">Immediate controls: {a.newHazardFlag.immediateControls}</p>
          <p className="text-sm font-medium">
            {a.newHazardFlag.resolved ? "Resolved" : "Unresolved — requires action"}
          </p>
        </Section>
      )}

      <Section title="Declarations">
        <ul className="text-sm">
          {a.declarations.map((d) => (
            <li key={d.id}>
              {DECLARATION_LABELS[d.declarationKey] ?? d.declarationKey}:{" "}
              {d.checked ? "Confirmed" : "Not confirmed"}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`Team sign-ons (${a.signOns.length})`}>
        <ul className="text-sm space-y-1">
          {a.signOns.map((s) => (
            <li key={s.id}>
              {s.worker.name} {s.isPrimary ? "(Primary)" : ""} · Version {s.version} —{" "}
              {new Date(s.signedAt).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}
            </li>
          ))}
        </ul>
      </Section>

      {a.supervisorReviews.length > 0 && (
        <Section title="Version history — supervisor reviews">
          <ul className="space-y-3 text-sm">
            {a.supervisorReviews.map((r) => (
              <li key={r.id} className="border border-neutral-200 rounded-lg p-3">
                <p className="font-semibold">
                  Version {r.version} — {r.decision.replace(/_/g, " ")}
                </p>
                <p className="text-neutral-600">
                  {r.supervisor.name} —{" "}
                  {new Date(r.reviewedAt).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}
                </p>
                {r.comments && <p className="mt-1">Comments: {r.comments}</p>}
                {r.additionalControls && (
                  <p className="mt-1">Additional controls: {r.additionalControls}</p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Audit trail">
        <ul className="text-xs text-neutral-600 space-y-1">
          {a.auditLogs.map((log) => (
            <li key={log.id}>
              {new Date(log.timestamp).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })} — {log.action} by {displayActor(log.actorName)}
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-neutral-200 rounded-lg p-4">
      <h2 className="font-semibold text-neutral-900 mb-2">{title}</h2>
      {children}
    </section>
  );
}
