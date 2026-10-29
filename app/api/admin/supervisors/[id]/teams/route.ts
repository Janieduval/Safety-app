import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSupervisorTeams, setSupervisorTeams } from "@/lib/supervisorTeams";

// Admin only (protected by middleware): read or set a supervisor's teams.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json(await getSupervisorTeams(params.id));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const exists = await prisma.supervisor.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Supervisor not found." }, { status: 404 });
  try {
    const { teamIds } = await req.json();
    const saved = await setSupervisorTeams(params.id, teamIds);
    return NextResponse.json({ ok: true, teamIds: saved });
  } catch {
    return NextResponse.json({ error: "Could not save the teams." }, { status: 400 });
  }
}
