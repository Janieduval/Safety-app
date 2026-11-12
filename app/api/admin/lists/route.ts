import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAdminSessionToken } from "@/lib/adminSession";

// Site lists: the Teams, SWMS, PPE and Permits that workers pick from in a Take 5.
// GET lists them all; POST adds one; PATCH renames, restores or changes
// "ticked by default" (PPE); DELETE removes one.
//
// "Other" is kept in every list and can't be renamed or removed: it's what lets
// workers type their own answer.
// Removing something already used in a Take 5 only hides it from new Take 5s,
// so old records and PDFs keep their wording. Unused ones are deleted.

type ListKey = "teams" | "swms" | "ppe" | "permits";
const LISTS: ListKey[] = ["teams", "swms", "ppe", "permits"];

async function isAdmin() {
  return !!(await verifyAdminSessionToken(cookies().get("admin_session")?.value));
}

// Each copy of JSAFE has one project; SWMS, PPE and permits belong to it.
async function siteProjectId(): Promise<string | null> {
  const p = await prisma.project.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  return p?.id ?? null;
}

function clean(label: unknown): string {
  return typeof label === "string" ? label.replace(/\s+/g, " ").trim() : "";
}

async function loadAll(projectId: string | null) {
  const [teams, swms, ppe, permits] = await Promise.all([
    prisma.teamOption.findMany({
      orderBy: { label: "asc" },
      include: { _count: { select: { assessments: true, hazardTemplates: true } } },
    }),
    projectId
      ? prisma.swmsOption.findMany({
          where: { projectId },
          orderBy: { label: "asc" },
          include: { _count: { select: { assessmentLinks: true } } },
        })
      : [],
    projectId
      ? prisma.ppeOption.findMany({
          where: { projectId },
          orderBy: { label: "asc" },
          include: { _count: { select: { assessmentLinks: true } } },
        })
      : [],
    projectId
      ? prisma.permitType.findMany({
          where: { projectId },
          orderBy: { label: "asc" },
          include: { _count: { select: { assessmentLinks: true } } },
        })
      : [],
  ]);
  return {
    teams: teams.map((t) => ({
      id: t.id,
      label: t.label,
      active: t.active,
      uses: t._count.assessments + t._count.hazardTemplates,
    })),
    swms: swms.map((o) => ({ id: o.id, label: o.label, active: o.active, uses: o._count.assessmentLinks })),
    ppe: ppe.map((o) => ({
      id: o.id,
      label: o.label,
      active: o.active,
      preselected: o.preselected,
      uses: o._count.assessmentLinks,
    })),
    permits: permits.map((o) => ({ id: o.id, label: o.label, active: o.active, uses: o._count.assessmentLinks })),
  };
}

// Finds an item in a list by id (or by label, case ignored).
async function findItem(list: ListKey, projectId: string | null, by: { id?: string; label?: string }) {
  const label = by.label ? { equals: by.label, mode: "insensitive" as const } : undefined;
  if (list === "teams") {
    return prisma.teamOption.findFirst({ where: by.id ? { id: by.id } : { label } });
  }
  if (!projectId) return null;
  const where: any = by.id ? { id: by.id, projectId } : { projectId, label };
  if (list === "swms") return prisma.swmsOption.findFirst({ where });
  if (list === "ppe") return prisma.ppeOption.findFirst({ where });
  return prisma.permitType.findFirst({ where });
}

async function updateItem(list: ListKey, id: string, data: any) {
  if (list === "teams") return prisma.teamOption.update({ where: { id }, data });
  if (list === "swms") return prisma.swmsOption.update({ where: { id }, data });
  if (list === "ppe") return prisma.ppeOption.update({ where: { id }, data });
  return prisma.permitType.update({ where: { id }, data });
}

function badList(list: unknown): list is never {
  return !LISTS.includes(list as ListKey);
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  return NextResponse.json(await loadAll(await siteProjectId()));
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const list = body.list as ListKey;
  const label = clean(body.label);
  if (badList(list)) return NextResponse.json({ error: "Unknown list." }, { status: 400 });
  if (!label) return NextResponse.json({ error: "Type a name first." }, { status: 400 });
  if (label.length > 160) return NextResponse.json({ error: "That name is too long." }, { status: 400 });

  const projectId = await siteProjectId();
  if (list !== "teams" && !projectId) {
    return NextResponse.json({ error: "No project set up yet." }, { status: 400 });
  }

  // Already there? Bring it back if it was removed, otherwise say so.
  const existing: any = await findItem(list, projectId, { label });
  if (existing) {
    if (existing.active) {
      return NextResponse.json({ error: `"${existing.label}" is already in the list.` }, { status: 409 });
    }
    await updateItem(list, existing.id, { active: true });
  } else if (list === "teams") {
    await prisma.teamOption.create({ data: { label } });
  } else if (list === "swms") {
    await prisma.swmsOption.create({ data: { projectId: projectId!, label } });
  } else if (list === "ppe") {
    await prisma.ppeOption.create({ data: { projectId: projectId!, label, preselected: !!body.preselected } });
  } else {
    await prisma.permitType.create({ data: { projectId: projectId!, label } });
  }
  return NextResponse.json(await loadAll(projectId));
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const list = body.list as ListKey;
  if (badList(list)) return NextResponse.json({ error: "Unknown list." }, { status: 400 });
  const projectId = await siteProjectId();

  const item: any = await findItem(list, projectId, { id: String(body.id ?? "") });
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const data: any = {};
  if (body.label !== undefined) {
    const label = clean(body.label);
    if (item.label === "Other") {
      return NextResponse.json({ error: '"Other" can\'t be renamed.' }, { status: 400 });
    }
    if (!label) return NextResponse.json({ error: "The name can't be empty." }, { status: 400 });
    if (label.length > 160) return NextResponse.json({ error: "That name is too long." }, { status: 400 });
    const clash: any = await findItem(list, projectId, { label });
    if (clash && clash.id !== item.id) {
      return NextResponse.json({ error: `"${clash.label}" is already in the list.` }, { status: 409 });
    }
    data.label = label;
  }
  if (body.active === true) data.active = true;
  if (list === "ppe" && typeof body.preselected === "boolean") data.preselected = body.preselected;

  if (Object.keys(data).length) await updateItem(list, item.id, data);
  return NextResponse.json(await loadAll(projectId));
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const list = body.list as ListKey;
  if (badList(list)) return NextResponse.json({ error: "Unknown list." }, { status: 400 });
  const projectId = await siteProjectId();

  const item: any = await findItem(list, projectId, { id: String(body.id ?? "") });
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (item.label === "Other") {
    return NextResponse.json({ error: '"Other" stays so workers can type their own.' }, { status: 400 });
  }

  // Used in a Take 5 (or a saved answer)? Hide it so old records keep their wording.
  const all = await loadAll(projectId);
  const uses = (all[list] as { id: string; uses: number }[]).find((x) => x.id === item.id)?.uses ?? 0;
  if (uses > 0) {
    await updateItem(list, item.id, { active: false });
  } else if (list === "teams") {
    await prisma.teamOption.delete({ where: { id: item.id } });
  } else if (list === "swms") {
    await prisma.swmsOption.delete({ where: { id: item.id } });
  } else if (list === "ppe") {
    await prisma.ppeOption.delete({ where: { id: item.id } });
  } else {
    await prisma.permitType.delete({ where: { id: item.id } });
  }
  return NextResponse.json(await loadAll(projectId));
}
