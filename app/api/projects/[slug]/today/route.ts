import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Today's Take 5s for one project (Sydney time), for the crew sign-on list.
// Only the basics needed to find the right one: team, who started it,
// time, location, status and how many have signed on.
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const project = await prisma.project.findUnique({
    where: { qrSlug: params.slug },
    select: { id: true, active: true },
  });
  if (!project || !project.active) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Look back 36 hours, then keep only those dated "today" in Sydney.
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000);
  const rows = await prisma.assessment.findMany({
    where: {
      projectId: project.id,
      dateTime: { gte: since },
      status: { not: "archived" },
    },
    select: {
      id: true,
      dateTime: true,
      status: true,
      location: true,
      otherTeamText: true,
      team: { select: { label: true } },
      completedByWorker: { select: { name: true } },
      _count: { select: { signOns: true } },
    },
    orderBy: { dateTime: "desc" },
  });

  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" });
  const today = fmt.format(new Date());

  const assessments = rows
    .filter((r) => fmt.format(r.dateTime) === today)
    .map((r) => ({
      id: r.id,
      dateTime: r.dateTime,
      status: r.status,
      location: r.location,
      team: r.team?.label ?? r.otherTeamText ?? null,
      author: r.completedByWorker?.name ?? null,
      signedOn: r._count.signOns,
    }));

  return NextResponse.json({ assessments });
}
