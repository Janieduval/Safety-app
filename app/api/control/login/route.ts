import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CC_COOKIE, isControlCentre, ownerEmail, ownerPasswordMatches } from "@/lib/control/core";
import { createAdminSessionToken } from "@/lib/adminSession";

// Control centre owner login (POST) and log out (DELETE).
// The owner is set with CONTROL_OWNER_EMAIL and CONTROL_OWNER_PASSWORD.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isControlCentre()) return NextResponse.json({ error: "Not the control centre." }, { status: 404 });
  const { email, password } = await req.json().catch(() => ({}));
  const okEmail = typeof email === "string" && !!ownerEmail() && email.trim().toLowerCase() === ownerEmail();
  const okPass = typeof password === "string" && ownerPasswordMatches(password);
  if (!okEmail || !okPass) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  }
  const token = await createAdminSessionToken(ownerEmail(), 60 * 60 * 12);
  cookies().set(CC_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  cookies().delete(CC_COOKIE);
  return NextResponse.json({ ok: true });
}
