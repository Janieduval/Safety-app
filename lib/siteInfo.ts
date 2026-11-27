import { prisma } from "@/lib/prisma";
import { siteCompany } from "@/lib/siteSettings";

// The project and company this site is for, e.g. "Yanco BESS" and
// "ACLE Services Pty Ltd".
export async function getSiteInfo(): Promise<{ project: string | null; company: string | null }> {
  const project = await prisma.project
    .findFirst({ where: { active: true }, orderBy: { createdAt: "asc" }, select: { name: true } })
    .catch(() => null);
  return { project: project?.name ?? null, company: siteCompany() || null };
}
