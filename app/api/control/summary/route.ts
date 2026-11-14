import { NextRequest, NextResponse } from "next/server";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { isControlCentre, keyMatches } from "@/lib/control/core";
import { connectToControlCentre } from "@/lib/control/connect";
import { supervisorsCanChooseTeams } from "@/lib/siteSettings";

// This site's numbers and health, for the control centre only (it sends the
// shared CONTROL_CENTRE_KEY). No Take 5 contents: just counts, what's working,
// what isn't, and the suggestion box.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TZ = "Australia/Sydney";
const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const startOfSydneyDay = (d: Date) => fromZonedTime(`${ymd(d)}T00:00:00`, TZ);
const DAY = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  if (isControlCentre()) return NextResponse.json({ error: "Not a JSAFE site." }, { status: 404 });
  if (!keyMatches(req.headers.get("x-control-key"))) {
    return NextResponse.json({ error: "Wrong control centre key." }, { status: 401 });
  }

  const now = new Date();
  const today = startOfSydneyDay(now);
  // Rolling weeks: the last 7 Sydney days including today, and the 7 before.
  const weekStart = startOfSydneyDay(new Date(today.getTime() - 6 * DAY + 12 * 60 * 60 * 1000));
  const prevStart = startOfSydneyDay(new Date(weekStart.getTime() - 7 * DAY + 12 * 60 * 60 * 1000));
  const monthStart = new Date(now.getTime() - 30 * DAY);

  const [
    project,
    recent,
    month,
    total,
    last,
    signOnsWeek,
    signOnsToday,
    newPeople,
    workers,
    supervisors,
    photosToday,
    events,
    suggestions,
  ] = await Promise.all([
    prisma.project.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } }),
    prisma.assessment.findMany({ where: { createdAt: { gte: prevStart } }, select: { createdAt: true } }),
    prisma.assessment.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.assessment.count(),
    prisma.assessment.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.signOn.findMany({ where: { signedAt: { gte: weekStart } }, select: { workerId: true }, distinct: ["workerId"] }),
    prisma.signOn.findMany({ where: { signedAt: { gte: today } }, select: { workerId: true }, distinct: ["workerId"] }),
    prisma.worker.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.worker.count({ where: { active: true, archived: false } }),
    prisma.supervisor.count({ where: { active: true, archived: false } }),
    prisma.hazardPhoto.count({ where: { createdAt: { gte: today } } }),
    prisma.appEvent.findMany({ where: { createdAt: { gte: today } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.suggestion.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  // Take 5s per day for the last 7 days, oldest first.
  const days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) days.push({ date: ymd(new Date(today.getTime() - i * DAY + 12 * 60 * 60 * 1000)), count: 0 });
  let weekTotal = 0;
  let lastWeekTotal = 0;
  for (const a of recent) {
    if (a.createdAt >= weekStart) {
      weekTotal++;
      const d = days.find((x) => x.date === ymd(a.createdAt));
      if (d) d.count++;
    } else {
      lastWeekTotal++;
    }
  }

  // Health from today's events.
  const tally = (kind: string, ok: boolean) =>
    events.filter((e) => e.kind === kind && e.ok === ok).reduce((n, e) => n + e.count, 0);
  const lastFail = (kind: string) => events.find((e) => e.kind === kind && !e.ok) ?? null;

  // Keep the connection fresh (at most every 30 minutes).
  void connectToControlCentre(req.nextUrl.origin).catch(() => {});

  return NextResponse.json({
    project: project
      ? { name: project.name, address: project.address, contractor: project.contractor, slug: project.qrSlug }
      : null,
    company: (process.env.COMPANY ?? "").trim() || null,
    version: {
      commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || null,
      message: (process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "").split("\n")[0].slice(0, 120) || null,
    },
    usage: {
      today: days[6]?.count ?? 0,
      days,
      weekTotal,
      lastWeekTotal,
      month,
      total,
      lastTake5At: last?.createdAt ?? null,
      peopleWeek: signOnsWeek.length,
      peopleToday: signOnsToday.length,
      newPeopleWeek: newPeople,
      workers,
      supervisors,
    },
    health: {
      database: true,
      photoStorage: !!process.env.BLOB_READ_WRITE_TOKEN,
      notificationsSetUp: !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT),
      dailyTidyUp: !!process.env.CRON_SECRET,
      ownerSet: !!process.env.OWNER_ADMIN_EMAIL,
      bootstrapLeftOn: !!process.env.BOOTSTRAP_SECRET,
      photosToday,
      photoFailedToday: tally("photo", false),
      pdfFailedToday: tally("pdf", false),
      pushSentToday: tally("push", true),
      pushFailedToday: tally("push", false),
      lastPdfError: lastFail("pdf")?.detail ?? null,
      lastPhotoError: lastFail("photo")?.detail ?? null,
      lastPushError: lastFail("push")?.detail ?? null,
    },
    errors: events
      .filter((e) => !e.ok)
      .slice(0, 30)
      .map((e) => ({ at: e.createdAt, kind: e.kind, detail: e.detail, count: e.count })),
    suggestions: suggestions.map((s) => ({
      id: s.id,
      text: s.text,
      name: s.name,
      role: s.role,
      status: s.status,
      createdAt: s.createdAt,
    })),
    settings: {
      supervisorsChooseTeams: supervisorsCanChooseTeams(),
      samplePeople: (process.env.SAMPLE_PEOPLE ?? "").trim().toLowerCase() !== "no",
    },
  });
}
