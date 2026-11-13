import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSessionToken } from "@/lib/adminSession";
import { isSiteOwner } from "@/lib/siteSettings";

// Tells the admin pages whether this login is the site owner (who sees Suggestions).
export const dynamic = "force-dynamic";

export async function GET() {
  const email = await verifyAdminSessionToken(cookies().get("admin_session")?.value);
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ isOwner: isSiteOwner(email) });
}
