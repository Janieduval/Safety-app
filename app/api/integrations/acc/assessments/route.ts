import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Returns Sydney calendar date (YYYY-MM-DD) for a given date/time.
function sydneyDateString(d: Date | string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" });
  return fmt.format(new Date(d));
}

// Returns yesterday's Sydney calendar date as YYYY-MM-DD.
function yesterdaySydneyDateString(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" });
  const todayStr = fmt.format(new Date());
  const [y, m, d] = todayStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

/**
 * GET /api/integrations/acc/assessments?date=YYYY-MM-DD
 *
 * Auth: requires header `x-api-key` matching ACC_INTEGRATION_API_KEY.
 * If `date` is omitted, defaults to yesterday (Australia/Sydney calendar day).
 * Returns every assessment dated that day, regardless of status, each with
 * a direct link to its PDF.
 */
export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.ACC_INTEGRATION_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dateParam = req.nextUrl.searchParams.get("date");
  const targetDate = dateParam ?? yesterdaySydneyDateString();

  // Fetch a window wide enough to safely cover the target Sydney date
  // regardless of UTC offset, then filter precisely below.
  const since = new Date();
  since.setDate(since.getDate() - 3);

  const assessments = await prisma.assessment.findMany({
    where: { dateTime: { gte: since } },
    include: {
      project: true,
      team: true,
      completedByWorker: true,
    },
    orderBy: { dateTime: "asc" },
    take: 500,
  });

  const matching = assessments.filter((a) => sydneyDateString(a.dateTime) === targetDate);

  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const results = matching.map((a) => ({
    id: a.id,
    date: sydneyDateString(a.dateTime),
    dateTime: a.dateTime,
    project: a.project.name,
    team: a.team?.label ?? a.otherTeamText ?? null,
    worker: a.completedByWorker?.name ?? null,
    status: a.status,
    version: a.version,
    pdfUrl: `${baseUrl}/api/assessments/${a.id}/pdf`,
  }));

  return NextResponse.json({ date: targetDate, count: results.length, assessments: results });
}
