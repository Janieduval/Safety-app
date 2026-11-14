import { NextResponse } from "next/server";
import webpush from "web-push";
import { isControlOwner } from "@/lib/control/core";

// Control centre: makes a fresh pair of notification keys for a new site.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!(await isControlOwner())) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const keys = webpush.generateVAPIDKeys();
  return NextResponse.json({ publicKey: keys.publicKey, privateKey: keys.privateKey });
}
