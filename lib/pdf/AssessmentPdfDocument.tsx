import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import {
  STEP1_QUESTIONS,
  HAZARD_QUESTIONS,
  FINAL_DECLARATIONS,
} from "@/lib/constants";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  h1: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  h2: { fontSize: 12, fontWeight: 700, marginTop: 14, marginBottom: 6, borderBottom: "1 solid #333", paddingBottom: 2 },
  meta: { fontSize: 9, color: "#444", marginBottom: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { fontWeight: 700, width: 300 },
  value: { flex: 1 },
  badge: { fontSize: 9, padding: "2 6", backgroundColor: "#111", color: "#fff", borderRadius: 3, alignSelf: "flex-start" },
  card: { border: "1 solid #ccc", borderRadius: 4, padding: 8, marginBottom: 6 },
  warn: { color: "#b91c1c", fontWeight: 700 },
  signatureImg: { width: 160, height: 60, border: "1 solid #ccc" },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, fontSize: 8, color: "#888", textAlign: "center" },
});

function riskLabel(risk: string) {
  return risk.charAt(0).toUpperCase() + risk.slice(1);
}

const STEP1_LABELS: Record<string, string> = Object.fromEntries(
  STEP1_QUESTIONS.map((q) => [q.key, q.label])
);
const HAZARD_LABELS: Record<string, string> = Object.fromEntries(
  HAZARD_QUESTIONS.map((q) => [q.key, q.label])
);
const DECLARATION_LABELS: Record<string, string> = Object.fromEntries(
  FINAL_DECLARATIONS.map((d) => [d.key, d.label])
);

export default function AssessmentPdfDocument({ assessment }: { assessment: any }) {
  const a = assessment;
  const reviews = a.supervisorReviews ?? [];

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.h1}>Daily Task Safety Awareness</Text>
        <Text style={styles.meta}>Reference: {a.id}</Text>
        <Text style={styles.meta}>Status: {a.status.replace(/_/g, " ").toUpperCase()}</Text>
        <Text style={styles.meta}>Version: {a.version ?? 1}</Text>
        <Text style={styles.meta}>
          Project: {a.project.name} — {a.project.address} — {a.project.contractor}
        </Text>
        <Text style={styles.meta}>
          Date/time: {new Date(a.dateTime).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}
        </Text>
        <Text style={styles.meta}>
          Team: {a.team?.label ?? a.otherTeamText ?? "—"} | Location: {a.location ?? "—"}
        </Text>
        <Text style={styles.meta}>Completed by: {a.completedByWorker?.name ?? "—"}</Text>
        <Text style={styles.meta}>Task: {a.taskDescription ?? "—"}</Text>

        <Text style={styles.h2}>Step 1 — Plan the task</Text>
        {a.step1Responses.map((r: any) => (
          <View key={r.id} style={{ marginBottom: 3 }}>
            <View style={styles.row}>
              <Text style={styles.label}>{STEP1_LABELS[r.questionKey] ?? r.questionKey}</Text>
              <Text style={[styles.value, r.answer === false ? styles.warn : {}]}>
                {r.answer === null ? "Unanswered" : r.answer ? "Yes" : "No"}
              </Text>
            </View>
            {r.answer === false && r.noDetails ? (
              <Text style={{ fontSize: 9, marginLeft: 8 }}>Details: {r.noDetails}</Text>
            ) : null}
            {r.answer === false ? (
              <Text
                style={[
                  { fontSize: 9, marginLeft: 8, fontWeight: 700 },
                  r.spokenToSupervisor ? { color: "#15803d" } : styles.warn,
                ]}
              >
                {r.spokenToSupervisor
                  ? "✓ Confirmed: spoken with supervisor about this"
                  : "NOT CONFIRMED — has not spoken with a supervisor"}
              </Text>
            ) : null}
          </View>
        ))}

        <Text style={styles.h2}>SWMS</Text>
        <Text>
          {a.swms.map((s: any) => s.swmsOption.label).join(", ") || "None selected"}
          {a.swmsOtherText ? ` (Other: ${a.swmsOtherText})` : ""}
        </Text>

        <Text style={styles.h2}>PPE</Text>
        <Text>{a.ppe.map((p: any) => p.ppeOption.label).join(", ") || "None selected"}</Text>

        <Text style={styles.h2}>Permits</Text>
        {a.permitRequired ? (
          a.permits.map((p: any) => (
            <Text key={p.id}>
              {p.permitType.label} — Ref: {p.referenceNumber ?? "—"} —{" "}
              {p.issuedReviewedSigned ? "Confirmed" : "NOT CONFIRMED"}
            </Text>
          ))
        ) : (
          <Text>Not required</Text>
        )}

        <Text style={styles.h2}>Access &amp; changes</Text>
        <Text style={a.accessCheck?.safe === false ? styles.warn : {}}>
          Access route safe: {a.accessCheck?.safe === null ? "Unanswered" : a.accessCheck?.safe ? "Yes" : "No"}
        </Text>
        {a.accessCheck?.details ? <Text>Details: {a.accessCheck.details}</Text> : null}
        {a.accessCheck?.controlMeasure ? <Text>Control: {a.accessCheck.controlMeasure}</Text> : null}
        {a.changeEntries.map((c: any) => (
          <View key={c.id} style={styles.card}>
            <Text style={{ fontWeight: 700 }}>{c.category}</Text>
            <Text>{c.details}</Text>
            <Text>Controls: {c.controls}</Text>
            <Text>{c.controlled ? "Controlled" : "NOT CONTROLLED"}</Text>
          </View>
        ))}

        <Text style={styles.h2}>Hazards identified</Text>
        {a.hazardResponses
          .filter((r: any) => r.present)
          .map((r: any) => (
            <View key={r.id} wrap={false} style={{ marginBottom: 6 }}>
              <Text style={{ fontWeight: 700 }}>
                {HAZARD_LABELS[r.questionKey] ?? r.questionKey}: Yes
              </Text>
              {r.cards.map((c: any) => (
                <View key={c.id} style={styles.card}>
                  <Text>{c.description}</Text>
                  <Text>
                    Initial risk: {riskLabel(c.initialRisk)} → Residual risk:{" "}
                    <Text
                      style={
                        c.residualRisk === "high" || c.residualRisk === "extreme"
                          ? styles.warn
                          : {}
                      }
                    >
                      {riskLabel(c.residualRisk)}
                    </Text>
                  </Text>
                  <Text>Controls: {c.controls}</Text>
                  <Text>Responsible: {c.responsiblePerson}</Text>
                  <Text>{c.controlConfirmed ? "Control confirmed" : "Control NOT confirmed"}</Text>
                  {c.comments ? <Text>Comments: {c.comments}</Text> : null}
                </View>
              ))}
            </View>
          ))}

        {a.newHazardFlag?.present && (
          <View wrap={false}>
            <Text style={styles.h2}>New hazard not covered by SWMS</Text>
            <Text style={styles.warn}>{a.newHazardFlag.description}</Text>
            <Text>Immediate controls: {a.newHazardFlag.immediateControls}</Text>
            <Text>{a.newHazardFlag.resolved ? "Resolved" : "UNRESOLVED"}</Text>
          </View>
        )}

        <Text style={styles.h2}>Declarations</Text>
        {a.declarations.map((d: any) => (
          <Text key={d.id}>
            {DECLARATION_LABELS[d.declarationKey] ?? d.declarationKey}:{" "}
            {d.checked ? "Confirmed" : "NOT CONFIRMED"}
          </Text>
        ))}

        <Text style={styles.h2}>Team sign-on ({a.signOns.length})</Text>
        {a.signOns.map((s: any) => (
          <View key={s.id} wrap={false} style={{ marginBottom: 8 }}>
            <Text>
              {s.worker.name} {s.isPrimary ? "(Primary)" : ""} · Version {s.version} —{" "}
              {new Date(s.signedAt).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}
            </Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {s.signatureData ? <Image src={s.signatureData} style={styles.signatureImg} /> : null}
          </View>
        ))}

        {a.changeAcknowledgments?.length > 0 && (
          <View wrap={false}>
            <Text style={styles.h2}>Change acknowledgments</Text>
            {a.changeAcknowledgments.map((ack: any) => (
              <View key={ack.id} style={{ marginBottom: 8 }}>
                <Text>
                  Version {ack.versionAtAck} acknowledged —{" "}
                  {new Date(ack.acknowledgedAt).toLocaleString("en-AU", {
                    timeZone: "Australia/Sydney",
                  })}
                </Text>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                {ack.signatureData ? (
                  <Image src={ack.signatureData} style={styles.signatureImg} />
                ) : null}
              </View>
            ))}
          </View>
        )}

        {reviews.length > 0 && (
          <View wrap={false}>
            <Text style={styles.h2}>Version history — supervisor reviews</Text>
            {reviews.map((r: any) => (
              <View key={r.id} style={{ marginBottom: 8 }}>
                <Text>
                  Version {r.version} — {r.decision.toUpperCase()} —{" "}
                  {r.supervisor.name} —{" "}
                  {new Date(r.reviewedAt).toLocaleString("en-AU", {
                    timeZone: "Australia/Sydney",
                  })}
                </Text>
                {r.comments ? <Text>Comments: {r.comments}</Text> : null}
                {r.additionalControls ? (
                  <Text>Additional controls: {r.additionalControls}</Text>
                ) : null}
                {r.signatureData ? (
                  <Image src={r.signatureData} style={styles.signatureImg} />
                ) : null}
              </View>
            ))}
          </View>
        )}

        {a.reassessments?.length > 0 && (
          <View wrap={false}>
            <Text style={styles.h2}>Linked reassessments</Text>
            {a.reassessments.map((r: any) => (
              <Text key={r.id}>
                {new Date(r.dateTime).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })} —{" "}
                {r.whatChanged}
              </Text>
            ))}
          </View>
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
