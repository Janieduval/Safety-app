import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { siteCompany } from "@/lib/siteSettings";

// The project and company this site is for, e.g. "Yanco BESS" and
// "ACLE Services Pty Ltd". Shown on the login pages and dashboards.
export const dynamic = "force-dynamic";

export async function GET() {
  const project = await prisma.project
    .findFirst({ where: { active: true }, orderBy: { createdAt: "asc" }, select: { name: true } })
    .catch(() => null);
  return NextResponse.json({ project: project?.name ?? null, company: siteCompany() });
}
