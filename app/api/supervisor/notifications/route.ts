import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySupervisorSessionToken } from "@/lib/supervisorSession";
import { DAYS, parseDays } from "@/lib/morningReminder";

// The logged-in supervisor's notification choices (the Notifications card):
// - notifyReviews: a notification when one of their teams submits a Take 5
// - reminderOn: the 9am morning reminder
// - days / watchTeamIds: when the reminder comes, and which teams to flag
// Only the settings sent are changed.

async function currentSupervisor() {
  return verifySupervisorSessionToken(cookies().get("supervisor_session")?.value);
}

export async function PUT(req: NextRequest) {
  const supervisorId = await currentSupervisor();
  if (!supervisorId) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const data: {
    notifyReviews?: boolean;
    reminderOn?: boolean;
    reminderDays?: string;
    watchTeamIds?: string[];
  } = {};

  if (typeof body.notifyReviews === "boolean") data.notifyReviews = body.notifyReviews;
  if (typeof body.reminderOn === "boolean") data.reminderOn = body.reminderOn;

  if (Array.isArray(body.days)) {
    const days = parseDays(body.days.join(","));
    data.reminderDays = DAYS.filter((d) => days.includes(d)).join(",");
  }

  if (Array.isArray(body.watchTeamIds)) {
    const wanted = body.watchTeamIds.filter((t: unknown) => typeof t === "string");
    const valid = await prisma.teamOption.findMany({
      where: { id: { in: wanted }, active: true },
      select: { id: true },
    });
    data.watchTeamIds = valid.map((v) => v.id);
  }

  const saved = await prisma.supervisor.update({
    where: { id: supervisorId },
    data,
    select: { notifyReviews: true, reminderOn: true, reminderDays: true, watchTeamIds: true },
  });
  return NextResponse.json({
    ok: true,
    notifyReviews: saved.notifyReviews,
    reminderOn: saved.reminderOn,
    days: parseDays(saved.reminderDays),
    watchTeamIds: saved.watchTeamIds,
  });
}
