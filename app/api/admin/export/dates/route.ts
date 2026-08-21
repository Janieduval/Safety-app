import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyAdminSessionToken } from "@/lib/adminSession";

function sydneyDateString(d: Date | string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" });
  return fmt.format(new Date(d));
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

  const dates = Object.entries(counts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return NextResponse.json({ dates });
}
