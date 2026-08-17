import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
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
    include: {
      hazardTemplates: {
        where: { active: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  return NextResponse.json({ project, teams });
}
