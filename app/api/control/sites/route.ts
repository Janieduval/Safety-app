import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isControlOwner } from "@/lib/control/core";

// Control centre: GET ?since=<ISO time> lists sites that connected since then
// (for the "Waiting for the site…" box). PATCH moves a site to a company or
// hides it (archived).

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isControlOwner())) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const since = new Date(req.nextUrl.searchParams.get("since") ?? 0);
  const sites = await prisma.ccSite.findMany({
    where: { firstSeenAt: { gte: isNaN(since.getTime()) ? new Date(0) : since } },
    include: { company: true },
    orderBy: { firstSeenAt: "desc" },
  });
  return NextResponse.json({ sites });
}

export async function PATCH(req: NextRequest) {
  if (!(await isControlOwner())) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const data: { companyId?: string | null; archived?: boolean } = {};
  if (body.companyId !== undefined) data.companyId = body.companyId || null;
  if (typeof body.archived === "boolean") data.archived = body.archived;
  try {
    const site = await prisma.ccSite.update({ where: { id }, data });
    return NextResponse.json({ site });
  } catch {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }
}
