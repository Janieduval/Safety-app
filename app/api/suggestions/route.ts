import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyAdminSessionToken } from "@/lib/adminSession";
import { verifySupervisorSessionToken } from "@/lib/supervisorSession";

// Suggestion box: anyone (workers, supervisors, admins) can send an idea.
// Who sent it is worked out here, from their login, rather than trusted from
// the form. Workers can add their name if they want to.

export const dynamic = "force-dynamic";

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  // A hidden field real people never fill in; bots usually do.
  if (clean(body.website, 200)) return NextResponse.json({ ok: true });

  const text = typeof body.text === "string" ? body.text.trim().slice(0, 2000) : "";
  if (text.length < 5) {
    return NextResponse.json({ error: "Please write a few words about your idea." }, { status: 400 });
  }

  let role: "worker" | "supervisor" | "admin" = "worker";
  let name: string | null = clean(body.name, 80) || null;

  const adminEmail = await verifyAdminSessionToken(cookies().get("admin_session")?.value);
  const supervisorId = adminEmail
    ? null
    : await verifySupervisorSessionToken(cookies().get("supervisor_session")?.value);

  if (adminEmail) {
    role = "admin";
    name = name ?? adminEmail;
  } else if (supervisorId) {
    role = "supervisor";
    const sup = await prisma.supervisor.findUnique({ where: { id: supervisorId }, select: { name: true } });
    name = sup?.name ?? name;
  }

  await prisma.suggestion.create({ data: { text, name, role } });
  return NextResponse.json({ ok: true });
}
