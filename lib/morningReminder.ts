import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";

// The 9am morning reminder for supervisors: how many Take 5s are waiting for
// their review, and which of their chosen teams haven't done a Take 5 today.

const TZ = "Australia/Sydney";
export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const DAY_LABEL: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export function sydneyNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-AU", {
      timeZone: TZ,
      weekday: "short",
      hour: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
  return {
    day: String(parts.weekday ?? "").slice(0, 3).toLowerCase(),
    hour: Number(parts.hour),
    startOfDay: fromZonedTime(`${ymd}T00:00:00`, TZ),
  };
}

// "mon,tue" -> ["mon","tue"], keeping only real days.
export function parseDays(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter((d) => (DAYS as readonly string[]).includes(d));
}

// "Rails installation", "Rails installation and Piling", "A, B and 2 more".
function teamList(labels: string[]): string {
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels[0]}, ${labels[1]} and ${labels.length - 2} more`;
}

export type Reminder = { supervisorId: string; name: string; title: string; body: string };

// Works out today's reminder for every supervisor who wants one today.
// Supervisors with nothing to report get no reminder.
export async function buildMorningReminders(now = new Date()): Promise<Reminder[]> {
  const { day, startOfDay } = sydneyNow(now);

  const supervisors = await prisma.supervisor.findMany({
    where: { active: true, archived: false },
    select: {
      id: true,
      reminderOn: true,
      name: true,
      projectId: true,
      reminderDays: true,
      watchTeamIds: true,
      teams: { select: { teamId: true } },
    },
  });

  const teams = await prisma.teamOption.findMany({ where: { active: true }, select: { id: true, label: true } });
  const teamLabel = new Map(teams.map((t) => [t.id, t.label]));

  const out: Reminder[] = [];
  for (const s of supervisors) {
    if (!parseDays(s.reminderDays).includes(day)) continue;

    // Take 5s not reviewed yet (by anyone): their teams, or every team if they
    // haven't chosen any. Only when "Get a reminder at 9am" is switched on.
    const myTeamIds = s.teams.map((t) => t.teamId);
    const waiting = !s.reminderOn ? 0 : await prisma.assessment.count({
      where: {
        projectId: s.projectId,
        status: "awaiting_supervisor_review",
        ...(myTeamIds.length ? { teamId: { in: myTeamIds } } : {}),
      },
    });

    // "Tell me if these teams haven't done a Take 5": ticked teams with no Take 5 started today.
    const watch = s.watchTeamIds.filter((id) => teamLabel.has(id));
    let missing: string[] = [];
    if (watch.length) {
      const doneToday = await prisma.assessment.findMany({
        where: { projectId: s.projectId, teamId: { in: watch }, createdAt: { gte: startOfDay } },
        select: { teamId: true },
        distinct: ["teamId"],
      });
      const done = new Set(doneToday.map((a) => a.teamId));
      missing = watch.filter((id) => !done.has(id)).map((id) => teamLabel.get(id)!);
      missing.sort((a, b) => a.localeCompare(b));
    }

    const lines: string[] = [];
    if (waiting > 0) {
      lines.push(`${waiting} Take 5${waiting === 1 ? " hasn't" : "s haven't"} been reviewed yet.`);
    }
    if (missing.length) {
      lines.push(`${teamList(missing)} ${missing.length === 1 ? "hasn't" : "haven't"} done a Take 5 today.`);
    }
    if (!lines.length) continue;

    const first = s.name.trim().split(/\s+/)[0];
    out.push({
      supervisorId: s.id,
      name: s.name,
      title: `Good morning${first ? `, ${first}` : ""}`,
      body: lines.join(" "),
    });
  }
  return out;
}
