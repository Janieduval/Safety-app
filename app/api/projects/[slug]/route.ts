import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Options that must always exist. If one is missing it is created automatically.
// If an admin later switches one off (active = false) it is left alone.
const DEFAULT_SWMS_OPTIONS = ["Layout and install of PV modules inc Jigging Rails SWMS"];
const DEFAULT_TEAMS = ["Module installation"];

async function ensureDefaults(projectId: string) {
  try {
    for (const label of DEFAULT_SWMS_OPTIONS) {
      const existing = await prisma.swmsOption.findFirst({ where: { projectId, label } });
      if (!existing) {
        await prisma.swmsOption.create({ data: { projectId, label } });
      }
    }
    for (const label of DEFAULT_TEAMS) {
      await prisma.teamOption.upsert({
        where: { label },
        update: {},
        create: { label },
      });
    }
  } catch (e) {
    // Never let this housekeeping step stop the project page from loading.
    console.error("ensureDefaults failed", e);
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
    await ensureDefaults(base.id);
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
  // Each team comes with its saved hazard answers — the hazard card's
  // suggestion dropdown is built from these.
  const teams = await prisma.teamOption.findMany({
    where: { active: true },
    orderBy: { label: "asc" },
    include: {
      hazardTemplates: {
        where: { active: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  return NextResponse.json({ project, teams });
}
