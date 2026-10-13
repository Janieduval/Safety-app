import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// SWMS options that must always exist for every project. If one is missing it is
// created automatically. If an admin later switches one off (active = false) it is
// left alone, because the lookup below ignores the active flag.
const DEFAULT_SWMS_OPTIONS = ["Layout and install of PV modules inc Jigging Rails SWMS"];

async function ensureDefaultSwmsOptions(projectId: string) {
  for (const label of DEFAULT_SWMS_OPTIONS) {
    const existing = await prisma.swmsOption.findFirst({ where: { projectId, label } });
    if (!existing) {
      await prisma.swmsOption.create({ data: { projectId, label } });
    }
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const base = await prisma.project.findUnique({
    where: { qrSlug: params.slug },
    select: { id: true, active: true },
  });
  if (base && base.active) {
    await ensureDefaultSwmsOptions(base.id);
  }

  const project = await prisma.project.findUnique({
    where: { qrSlug: params.slug },
    include: {
      workers: { where: { active: true, archived: false }, orderBy: { name: "asc" } },
      supervisors: { where: { active: true, archived: false }, orderBy: { name: "asc" } },
      swmsOptions: { where: { active: true }, orderBy: { label: "asc" } },
      ppeOptions: { where: { active: true }, orderBy: { label: "asc" } },
      permitTypes: { where: { active: true }, orderBy: { label: "asc" } },
    },
  });
  if (!project || !project.active) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const teams = await prisma.teamOption.findMany({
    where: { active: true },
    orderBy: { label: "asc" },
  });
  return NextResponse.json({ project, teams });
}
