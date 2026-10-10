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
