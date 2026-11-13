import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyAdminSessionToken } from "@/lib/adminSession";
import { isSiteOwner } from "@/lib/siteSettings";

// Suggestions for the site owner: GET lists them all, PATCH changes the status
// or the note, DELETE removes one. Only the admin login set as OWNER_ADMIN_EMAIL
// can use it (every admin, if that isn't set).

export const dynamic = "force-dynamic";

const STATUSES = ["new", "planned", "done", "not_doing"];

async function isAdmin() {
  return isSiteOwner(await verifyAdminSessionToken(cookies().get("admin_session")?.value));
}

async function list() {
  const suggestions = await prisma.suggestion.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  return { suggestions };
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Only the site owner can see suggestions." }, { status: 403 });
  return NextResponse.json(await list());
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Only the site owner can see suggestions." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Missing suggestion." }, { status: 400 });

  const data: { status?: string; adminNote?: string | null } = {};
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return NextResponse.json({ error: "Unknown status." }, { status: 400 });
    data.status = body.status;
  }
  if (body.adminNote !== undefined) {
    const note = typeof body.adminNote === "string" ? body.adminNote.trim().slice(0, 1000) : "";
    data.adminNote = note || null;
  }

  try {
    await prisma.suggestion.update({ where: { id }, data });
  } catch {
    return NextResponse.json({ error: "That suggestion no longer exists." }, { status: 404 });
  }
  return NextResponse.json(await list());
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Only the site owner can see suggestions." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (id) await prisma.suggestion.deleteMany({ where: { id } });
  return NextResponse.json(await list());
}
