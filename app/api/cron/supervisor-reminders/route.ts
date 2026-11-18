import { NextRequest, NextResponse } from "next/server";
import { buildMorningReminders, sydneyNow } from "@/lib/morningReminder";
import { notifySupervisorReminder } from "@/lib/push";

// The 9am morning reminder for supervisors. Vercel runs this twice a day
// (see vercel.json) so it lands at 9am Sydney time in both summer and
// winter time; it only sends when it's the 9 o'clock hour in Sydney.
// ?test=1 shows what would be sent, without sending anything.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const test = req.nextUrl.searchParams.get("test") === "1";
  const { hour } = sydneyNow();
  if (!test && hour !== 9) {
    return NextResponse.json({ ok: true, skipped: `It's ${hour}:00 in Sydney, not 9am.` });
  }

  const reminders = await buildMorningReminders();
  if (test) return NextResponse.json({ ok: true, test: true, reminders });

  let sent = 0;
  for (const r of reminders) {
    if (await notifySupervisorReminder(r.supervisorId, r.title, r.body)) sent++;
  }
  return NextResponse.json({ ok: true, reminders: reminders.length, sent });
}
