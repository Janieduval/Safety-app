import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAdminSessionToken } from "@/lib/adminSession";

const TZ = "Australia/Sydney";
const READY_HOUR = 22; // 10pm local time

function sydneyDateString(d: Date | string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
  return fmt.format(new Date(d));
}

function sydneyHour(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: TZ,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "0";
  return Number(hour);
}

function isDayReady(date: string, now: Date): boolean {
  const today = sydneyDateString(now);
  if (date < today) return true;
  if (date === today) return sydneyHour(now) >= READY_HOUR;
  return false;
}

export async function GET(req: NextRequest) {
  const adminEmail = await verifyAdminSessionToken(cookies().get("admin_session")?.value);
  if (!adminEmail) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const assessments = await prisma.assessment.findMany({
    where: { dateTime: { gte: since } },
    select: { dateTime: true },
  });

  const counts: Record<string, number> = {};
  for (const a of assessments) {
    const d = sydneyDateString(a.dateTime);
    counts[d] = (counts[d] ?? 0) + 1;
  }

  const now = new Date();

  const dates = Object.entries(counts)
    .map(([date, count]) => ({ date, count, ready: isDayReady(date, now) }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return NextResponse.json({ dates, readyHour: READY_HOUR });
}
