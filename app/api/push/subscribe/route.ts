import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public like the other worker-facing routes: links this device to one assessment.
export async function POST(req: NextRequest) {
  const { assessmentId, subscription } = await req.json();
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (!assessmentId || !endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true },
  });
  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }
  await prisma.pushSubscription.upsert({
    where: { endpoint_assessmentId: { endpoint, assessmentId } },
    update: { p256dh, auth },
    create: { assessmentId, endpoint, p256dh, auth },
  });
  return NextResponse.json({ ok: true });
}
