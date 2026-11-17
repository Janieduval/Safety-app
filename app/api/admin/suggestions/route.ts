import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyAdminSessionToken } from "@/lib/adminSession";

// Suggestions for the site's admins to read. Every admin can see them; their
// status (Planned, Done, Not doing) is set from the JSAFE control centre.

export const dynamic = "force-dynamic";

export async function GET() {
  const email = await verifyAdminSessionToken(cookies().get("admin_session")?.value);
  if (!email) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const suggestions = await prisma.suggestion.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  return NextResponse.json({ suggestions });
}
