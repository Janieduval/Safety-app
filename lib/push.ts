import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

// Sends a push to every device that opted in for this assessment.
// Never throws: a failed notification must not break the review itself.
export async function notifyAssessmentReviewed(
  assessmentId: string,
  decision: "approved" | "changes_required",
  comments?: string | null
) {
  try {
    if (!configure()) return;
    const subs = await prisma.pushSubscription.findMany({ where: { assessmentId } });
    if (subs.length === 0) return;

    const title =
      decision === "approved" ? "Your JSAFE was approved" : "Changes required on your JSAFE";
    const body =
      decision === "approved"
        ? "A supervisor has approved it."
        : comments?.trim()
        ? `Supervisor: ${comments.trim().slice(0, 120)}`
        : "A supervisor has asked for changes. Tap to review.";
    const payload = JSON.stringify({
      title,
      body,
      url: `/assess/${assessmentId}`,
      tag: `jsafe-${assessmentId}`,
    });

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          );
        } catch (e: any) {
          // Device unsubscribed or the subscription expired: clean it up.
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await prisma.pushSubscription.deleteMany({ where: { endpoint: s.endpoint } });
          }
        }
      })
    );
  } catch {
    // swallow: notifications are best-effort
  }
}

// Tells the supervisors who look after this JSAFE's team that it's waiting
// for review. "amended" = sent back after changes, "reassessed" = a new
// version after the job changed. Never throws.
export async function notifySupervisorsToReview(
  assessmentId: string,
  kind: "new" | "amended" | "reassessed" = "new"
) {
  try {
    if (!configure()) return;
    const a = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        teamId: true,
        version: true,
        projectId: true,
        team: { select: { label: true } },
        completedByWorker: { select: { name: true } },
      },
    });
    if (!a?.teamId) return;

    const subs = await prisma.supervisorPushSubscription.findMany({
      where: {
        supervisor: {
          active: true,
          archived: false,
          projectId: a.projectId,
          teams: { some: { teamId: a.teamId } },
        },
      },
    });
    if (subs.length === 0) return;

    const who = a.completedByWorker?.name ?? "A worker";
    const body =
      kind === "amended"
        ? `${who} sent back an amended JSAFE (version ${a.version}) for review.`
        : kind === "reassessed"
        ? `${who} reassessed a JSAFE (version ${a.version}). It needs a new review.`
        : `${who} submitted a JSAFE for review.`;
    const payload = JSON.stringify({
      title: `JSAFE to review · ${a.team?.label ?? "Your team"}`,
      body,
      url: `/assess/${assessmentId}/supervisor-review?from=supervisor`,
      tag: `jsafe-review-${assessmentId}`,
    });

    // The same phone can be linked to more than one supervisor: send once.
    const seen = new Set<string>();
    await Promise.all(
      subs
        .filter((s) => (seen.has(s.endpoint) ? false : (seen.add(s.endpoint), true)))
        .map(async (s) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              payload
            );
          } catch (e: any) {
            if (e?.statusCode === 404 || e?.statusCode === 410) {
              await prisma.supervisorPushSubscription.deleteMany({ where: { endpoint: s.endpoint } });
            }
          }
        })
    );
  } catch {
    // swallow: notifications are best-effort
  }
}
