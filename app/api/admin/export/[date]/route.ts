import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAdminSessionToken } from "@/lib/adminSession";

function sydneyDateString(d: Date | string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" });
  return fmt.format(new Date(d));
}

function cleanText(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

function toSafeFilenamePart(value: string): string {
  return cleanText(value).replace(/[\\/:*?"<>|]/g, "-");
}

export async function GET(req: NextRequest, { params }: { params: { date: string } }) {
  const adminEmail = await verifyAdminSessionToken(cookies().get("admin_session")?.value);
  if (!adminEmail) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const targetDate = params.date; // expected as YYYY-MM-DD

  // Window built around the TARGET date itself (not "today"), since this
  // route needs to work for any past date, not just recent ones.
  const target = new Date(targetDate + "T00:00:00Z");
  const since = new Date(target);
  since.setUTCDate(since.getUTCDate() - 1);
  const until = new Date(target);
  until.setUTCDate(until.getUTCDate() + 2);

  const candidates = await prisma.assessment.findMany({
    where: { dateTime: { gte: since, lte: until } },
    include: { project: true, team: true, completedByWorker: true },
  });

  const matching = candidates.filter((a) => sydneyDateString(a.dateTime) === targetDate);

  const results = matching.map((a) => {
    const workerName = cleanText(a.completedByWorker?.name) || "Unknown worker";
    const teamName = cleanText(a.team?.label ?? a.otherTeamText) || "No team";
    const filename = `${toSafeFilenamePart(workerName)} - ${toSafeFilenamePart(
      teamName
    )} - ${targetDate}.pdf`;
    return {
      id: a.id,
      project: a.project.name,
      team: teamName,
      worker: workerName,
      status: a.status,
      filename,
    };
  });

  return NextResponse.json({ date: targetDate, assessments: results });
}
