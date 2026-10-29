import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  const supervisors = await prisma.supervisor.findMany({
    where: { projectId },
    orderBy: [{ archived: "asc" }, { active: "desc" }, { name: "asc" }],
    include: { teams: { include: { team: { select: { label: true } } } } },
  });
  const withHasPin = supervisors.map(({ pinHash, teams, ...s }) => ({
    ...s,
    hasPin: !!pinHash,
    teamLabels: teams.map((t) => t.team.label).sort(),
  }));
  return NextResponse.json({ supervisors: withHasPin });
}

export async function POST(req: NextRequest) {
  const { projectId, name } = await req.json();
  if (!projectId || !name?.trim()) {
    return NextResponse.json({ error: "projectId and name are required" }, { status: 400 });
  }
  const supervisor = await prisma.supervisor.create({
    data: { projectId, name: name.trim() },
  });
  return NextResponse.json({ supervisor });
}
