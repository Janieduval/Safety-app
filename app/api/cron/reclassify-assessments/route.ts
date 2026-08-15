import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function sydneyDateString(d: Date | string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" });
  return fmt.format(new Date(d));
}

// Runs daily via Vercel Cron (see vercel.json). Any assessment dated
// before today (Australia/Sydney calendar day) that never reached
// "approved" gets moved into "worker_completed" — a holding area for
// yesterday's leftovers, separate from today's still-active items.
// Already-archived or already-reclassified assessments are left alone.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayStr = sydneyDateString(new Date());

  // Fetch a generous window, then filter precisely by each assessment's
  // own Sydney calendar date — sidesteps UTC/DST boundary arithmetic
  // entirely, consistent with how "today" is checked elsewhere in the app.
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const candidates = await prisma.assessment.findMany({
    where: {
      dateTime: { gte: since },
      status: { notIn: ["approved", "archived", "worker_completed"] },
    },
  });

  const toReclassify = candidates.filter((a) => sydneyDateString(a.dateTime) < todayStr);

  for (const a of toReclassify) {
    await prisma.assessment.update({
      where: { id: a.id },
      data: { status: "worker_completed" },
    });
    await prisma.auditLog.create({
      data: {
        assessmentId: a.id,
        entityType: "Assessment",
        entityId: a.id,
        action: "auto_reclassified",
        actorName: "system",
        beforeJson: JSON.stringify({ status: a.status }),
        afterJson: JSON.stringify({ status: "worker_completed" }),
      },
    });
  }

  return NextResponse.json({ ok: true, reclassified: toReclassify.length });
}
