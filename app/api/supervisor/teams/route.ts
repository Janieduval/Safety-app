import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySupervisorSessionToken } from "@/lib/supervisorSession";
import { getSupervisorTeams, setSupervisorTeams } from "@/lib/supervisorTeams";

// The logged-in supervisor's own teams.
async function currentSupervisor() {
  return verifySupervisorSessionToken(cookies().get("supervisor_session")?.value);
}

export async function GET() {
  const supervisorId = await currentSupervisor();
  if (!supervisorId) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  return NextResponse.json(await getSupervisorTeams(supervisorId));
}

export async function PUT(req: NextRequest) {
  const supervisorId = await currentSupervisor();
  if (!supervisorId) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  try {
    const { teamIds } = await req.json();
    const saved = await setSupervisorTeams(supervisorId, teamIds);
    return NextResponse.json({ ok: true, teamIds: saved });
  } catch {
    return NextResponse.json({ error: "Could not save your teams." }, { status: 400 });
  }
}
