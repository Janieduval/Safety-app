import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyAdminSessionToken } from "@/lib/adminSession";
import { verifySupervisorSessionToken } from "@/lib/supervisorSession";
import { HAZARD_QUESTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Period = "day" | "week" | "month";

const sydneyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" });
const sydneyDate = (d: Date | string) => sydneyFmt.format(new Date(d)); // YYYY-MM-DD

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function mondayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDays(dateStr, -((dow + 6) % 7));
}

function bucketOf(dateStr: string, period: Period): string {
  if (period === "day") return dateStr;
  if (period === "week") return mondayOf(dateStr);
  return dateStr.slice(0, 7);
}

function buildBuckets(period: Period, todayStr: string): string[] {
  const out: string[] = [];
  if (period === "day") {
    for (let i = 29; i >= 0; i--) out.push(addDays(todayStr, -i));
  } else if (period === "week") {
    const monday = mondayOf(todayStr);
    for (let i = 11; i >= 0; i--) out.push(addDays(monday, -7 * i));
  } else {
    const [y, mo] = todayStr.slice(0, 7).split("-").map(Number);
    for (let i = 11; i >= 0; i--) {
      out.push(new Date(Date.UTC(y, mo - 1 - i, 1)).toISOString().slice(0, 7));
    }
  }
  return out;
}

export async function GET(req: NextRequest) {
  // Open to either an admin or a supervisor session — stats are read-only.
  const adminEmail = await verifyAdminSessionToken(cookies().get("admin_session")?.value);
  const supervisorId = adminEmail
    ? null
    : await verifySupervisorSessionToken(cookies().get("supervisor_session")?.value);
  if (!adminEmail && !supervisorId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const raw = req.nextUrl.searchParams.get("period");
  const period: Period = raw === "week" || raw === "month" ? raw : "day";

  const todayStr = sydneyDate(new Date());
  const buckets = buildBuckets(period, todayStr);
  const bucketSet = new Set(buckets);
  const windowStart = period === "month" ? `${buckets[0]}-01` : buckets[0];
  // One extra day of slack either side so the Sydney/UTC boundary can't clip data.
  const since = new Date(`${addDays(windowStart, -1)}T00:00:00Z`);

  const [assessments, signOns, reviews, hazardRows] = await Promise.all([
    // "Done" = anything past draft (submitted, in review, approved, etc.).
    prisma.assessment.findMany({
      where: { dateTime: { gte: since }, status: { not: "draft" } },
      select: {
        dateTime: true,
        otherTeamText: true,
        team: { select: { label: true } },
      },
    }),
    prisma.signOn.findMany({
      where: { signedAt: { gte: since } },
      select: { workerId: true, signedAt: true },
    }),
    prisma.supervisorReview.findMany({
      where: { reviewedAt: { gte: since } },
      select: { reviewedAt: true },
    }),
    prisma.hazardResponse.findMany({
      where: {
        present: true,
        assessment: { dateTime: { gte: since }, status: { not: "draft" } },
      },
      select: { questionKey: true, assessment: { select: { dateTime: true } } },
    }),
  ]);

  const idx = (b: string) => buckets.indexOf(b);
  const zeros = () => buckets.map(() => 0);

  // Assessments completed per bucket
  const assessmentSeries = zeros();
  for (const a of assessments) {
    const b = bucketOf(sydneyDate(a.dateTime), period);
    if (bucketSet.has(b)) assessmentSeries[idx(b)]++;
  }

  // Distinct workers signed on per bucket (a worker signing twice counts once)
  const workerSets: Set<string>[] = buckets.map(() => new Set<string>());
  for (const s of signOns) {
    const b = bucketOf(sydneyDate(s.signedAt), period);
    if (bucketSet.has(b)) workerSets[idx(b)].add(s.workerId);
  }
  const workerSeries = workerSets.map((s) => s.size);

  // Supervisor reviews per bucket
  const reviewSeries = zeros();
  for (const r of reviews) {
    const b = bucketOf(sydneyDate(r.reviewedAt), period);
    if (bucketSet.has(b)) reviewSeries[idx(b)]++;
  }

  // Most common hazards across the whole window
  const hazardLabels: Record<string, string> = Object.fromEntries(
    HAZARD_QUESTIONS.map((q) => [q.key, q.label])
  );
  const hazardCounts: Record<string, number> = {};
  for (const h of hazardRows) {
    const b = bucketOf(sydneyDate(h.assessment.dateTime), period);
    if (!bucketSet.has(b)) continue;
    hazardCounts[h.questionKey] = (hazardCounts[h.questionKey] ?? 0) + 1;
  }
  const hazards = Object.entries(hazardCounts)
    .map(([key, count]) => ({ key, label: hazardLabels[key] ?? key, count }))
    .sort((a, b) => b.count - a.count);

  // Assessments per team, over the most recent few buckets only (keeps the table readable)
  const teamBucketCount = period === "day" ? 7 : period === "week" ? 8 : 6;
  const teamBuckets = buckets.slice(-teamBucketCount);
  const teamBucketSet = new Set(teamBuckets);
  const teamMap: Record<string, number[]> = {};
  for (const a of assessments) {
    const b = bucketOf(sydneyDate(a.dateTime), period);
    if (!teamBucketSet.has(b)) continue;
    const team = a.team?.label ?? (a.otherTeamText?.trim() || "No team");
    if (!teamMap[team]) teamMap[team] = teamBuckets.map(() => 0);
    teamMap[team][teamBuckets.indexOf(b)]++;
  }
  const teams = Object.entries(teamMap)
    .map(([team, counts]) => ({
      team,
      counts,
      total: counts.reduce((x, y) => x + y, 0),
    }))
    .sort((a, b) => b.total - a.total);

  // Today's headline numbers (always today, whichever period is selected)
  const today = {
    assessments: assessments.filter((a) => sydneyDate(a.dateTime) === todayStr).length,
    workersSignedOn: new Set(
      signOns.filter((s) => sydneyDate(s.signedAt) === todayStr).map((s) => s.workerId)
    ).size,
    reviews: reviews.filter((r) => sydneyDate(r.reviewedAt) === todayStr).length,
  };

  return NextResponse.json({
    period,
    buckets,
    assessmentSeries,
    workerSeries,
    reviewSeries,
    hazards,
    teamBuckets,
    teams,
    today,
  });
}
