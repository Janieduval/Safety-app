import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySupervisorSessionToken } from "@/lib/supervisorSession";

// Links (POST) or unlinks (DELETE) this device to the logged-in supervisor,
// so they get a notification when one of their teams submits a JSAFE.
async function currentSupervisor() {
  return verifySupervisorSessionToken(cookies().get("supervisor_session")?.value);
}

export async function POST(req: NextRequest) {
  const supervisorId = await currentSupervisor();
  if (!supervisorId) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const { subscription } = await req.json();
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }
  await prisma.supervisorPushSubscription.upsert({
    where: { endpoint_supervisorId: { endpoint, supervisorId } },
    update: { p256dh, auth },
    create: { supervisorId, endpoint, p256dh, auth },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supervisorId = await currentSupervisor();
  if (!supervisorId) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const { endpoint } = await req.json().catch(() => ({ endpoint: null }));
  if (!endpoint) return NextResponse.json({ error: "Missing device." }, { status: 400 });
  await prisma.supervisorPushSubscription.deleteMany({ where: { endpoint, supervisorId } });
  return NextResponse.json({ ok: true });
}
